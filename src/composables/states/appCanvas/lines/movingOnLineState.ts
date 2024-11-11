import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { mapReduce, patchPipe, pickMinItem, toList, toMap } from "../../../../utils/commons";
import { getLinePath, isLineShape, LineShape } from "../../../../shapes/line";
import {
  getClosestOutlineInfoOfLineByEdgeInfo,
  getIntersectionsBetweenLineShapeAndLine,
  getLineEdgeInfo,
  LineEdgeInfo,
} from "../../../../shapes/utils/line";
import { getD2, getDiagonalLengthOfRect, getPointLerpSlope, ISegment, TAU } from "../../../../utils/geometry";
import { add, getDistance, getPedal, IRectangle, isParallel, IVec2, moveRect, rotate, sub } from "okageo";
import {
  getAttachmentAnchorPoint,
  getEvenlySpacedLineAttachment,
  getEvenlySpacedLineAttachmentBetweenFixedOnes,
} from "../../../lineAttachmentHandler";
import { Shape, ShapeAttachment } from "../../../../models";
import { applyCurvePath } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { getNextShapeComposite } from "../../../shapeComposite";
import { newShapeSnapping, renderSnappingResult, ShapeSnapping, SnappingResult } from "../../../shapeSnapping";
import { getLineUnrelatedIds } from "../../../shapeRelation";

type Option = {
  lineId: string;
  shapeId: string;
};

/**
 * This state is intended to be stacked up on "MovingShape" state.
 */
export function newMovingOnLineState(option: Option): AppCanvasState {
  let keepMoving = false;
  let lineAnchor: IVec2 | undefined;
  let line: LineShape;
  let edgeInfo: LineEdgeInfo;
  let anchorPointAtStart: IVec2;
  let pointAtStart: IVec2;
  let patchAtStart: { [id: string]: Partial<Shape> };
  let evenlyAligned = false;

  // Shape snapping works well only one shape is moving on the line.
  let shapeSnapping: ShapeSnapping | undefined;
  let snappingResult: SnappingResult | undefined;
  let movingRectAtStart: IRectangle | undefined;

  function storeAtStart(ctx: AppCanvasStateContext) {
    pointAtStart = ctx.getCursorPoint();
    patchAtStart = ctx.getTmpShapeMap();
    const shapeComposite = ctx.getShapeComposite();
    const nextShapeComposite = getNextShapeComposite(shapeComposite, { update: patchAtStart });
    anchorPointAtStart = getAttachmentAnchorPoint(nextShapeComposite, nextShapeComposite.shapeMap[option.shapeId]);

    if (shapeSnapping) {
      movingRectAtStart = nextShapeComposite.getWrapperRect(nextShapeComposite.shapeMap[option.shapeId]);
    }
  }

  return {
    getLabel: () => "MovingOnLine",
    onStart: (ctx) => {
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const indexShape = shapeMap[option.shapeId];
      line = shapeMap[option.lineId] as LineShape;
      if (!indexShape || !isLineShape(line)) {
        keepMoving = true;
        return { type: "break" };
      }

      edgeInfo = getLineEdgeInfo(line);

      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      if (selectedIds.length === 1) {
        const snappableCandidateIds = getLineUnrelatedIds(shapeComposite, [option.lineId, ...selectedIds]);
        const snappableCandidates = shapeComposite.getShapesOverlappingRect(
          snappableCandidateIds.map((id) => shapeMap[id]),
          ctx.getViewRect(),
        );
        const snappableShapes = shapeComposite.getShapesOverlappingRect(
          snappableCandidates.filter((s) => !isLineShape(s)),
          ctx.getViewRect(),
        );
        shapeSnapping = newShapeSnapping({
          shapeSnappingList: snappableShapes.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
          scale: ctx.getScale(),
          gridSnapping: ctx.getGrid().getSnappingLines(),
        });

        ctx.setCommandExams([
          COMMAND_EXAM_SRC.DISABLE_SNAP,
          COMMAND_EXAM_SRC.ATTACH_TO_LINE_OFF,
          COMMAND_EXAM_SRC.EVENLY_SPACED,
        ]);
      } else {
        ctx.setCommandExams([COMMAND_EXAM_SRC.ATTACH_TO_LINE_OFF, COMMAND_EXAM_SRC.EVENLY_SPACED]);
      }

      storeAtStart(ctx);
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();

      if (keepMoving) {
        ctx.setTmpShapeMap(mapReduce(ctx.getTmpShapeMap(), (patch) => ({ ...patch, attachment: undefined })));
      } else {
        ctx.setTmpShapeMap({});
      }
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const shapeComposite = ctx.getShapeComposite();
          const shapeMap = shapeComposite.shapeMap;
          const latestShape = shapeComposite.mergedShapeMap[option.shapeId];

          if (!event.data.shift) {
            const latestAnchorP = getAttachmentAnchorPoint(shapeComposite, latestShape);
            const [localBounds] = shapeComposite.getLocalSpace(latestShape);
            if (getDistance(event.data.current, latestAnchorP) > getDiagonalLengthOfRect(localBounds)) {
              keepMoving = true;
              return { type: "break" };
            }
          }

          const diff = sub(event.data.current, pointAtStart);
          const movedIndexAnchorP = add(anchorPointAtStart, diff);
          const closestInfo = getClosestOutlineInfoOfLineByEdgeInfo(edgeInfo, movedIndexAnchorP, Infinity);
          if (!closestInfo) {
            keepMoving = true;
            return { type: "break" };
          }

          const selectedShapeMap = mapReduce(ctx.getSelectedShapeIdMap(), (_, id) => shapeMap[id]);
          const selectedShapes = toList(selectedShapeMap);
          let attachInfoMap: Map<string, [to: IVec2]>;

          if (event.data.shift) {
            evenlyAligned = true;
            const attachInfo = getEvenlySpacedLineAttachment(
              shapeMap,
              line.id,
              Object.keys(selectedShapeMap),
              option.shapeId,
              movedIndexAnchorP,
              edgeInfo,
            );
            attachInfoMap = attachInfo.attachInfoMap;
            lineAnchor = attachInfo.attachedPoint;
          } else {
            evenlyAligned = false;
            const baseTo = { x: closestInfo[1], y: 0 };
            const baseToP = closestInfo[0];
            lineAnchor = baseToP;
            attachInfoMap = new Map([[option.shapeId, [baseTo]]]);

            if (selectedShapes.length > 1) {
              const infoMap = getEvenlySpacedLineAttachmentBetweenFixedOnes(
                shapeMap,
                line.id,
                Object.keys(selectedShapeMap),
                option.shapeId,
                baseTo.x,
              );
              for (const [k, v] of infoMap) {
                attachInfoMap.set(k, v);
              }
            }

            snappingResult = undefined;
            if (!event.data.ctrl && shapeSnapping && movingRectAtStart) {
              const result = snapPointOnLine({
                line,
                shapeSnapping,
                movingRectAtStart,
                lineAnchorRate: closestInfo[1],
                lineAnchorP: lineAnchor,
                anchorPointAtStart,
                edgeInfo,
              });
              if (result) {
                snappingResult = result.snappingResult;
                lineAnchor = result.lineAnchor;
                attachInfoMap = new Map([[option.shapeId, [{ x: result.lineAnchorRate, y: 0 }]]]);
              }
            }
          }

          const patch = patchPipe(
            [
              (src) => {
                return mapReduce(src, (s) => {
                  const info = attachInfoMap.get(s.id)!;
                  const attachment: ShapeAttachment = {
                    anchor: { x: 0.5, y: 0.5 },
                    rotationType: "absolute",
                    rotation: 0,
                    // Inherit both source and temporary attachment to preserve attachment state as much as possible.
                    // => Attachment can be deleted in temporary data so "mergedShapeMap" doesn't work for this purpose.
                    ...shapeMap[s.id].attachment,
                    ...patchAtStart[s.id]?.attachment,
                    id: line.id,
                    to: info[0],
                  };
                  return { attachment };
                });
              },
              (_, currentPatch) => {
                return getPatchAfterLayouts(shapeComposite, { update: currentPatch });
              },
            ],
            toMap(Array.from(attachInfoMap.keys()).map((id) => shapeMap[id])),
          );
          ctx.setTmpShapeMap(patch.patch);

          // If patch of this line exists, it means this line depends on moving shapes.
          if (patch.patch[line.id]) {
            keepMoving = true;
            return { type: "break" };
          }

          return;
        }
        case "pointerup": {
          if (event.data.options.ctrl) return ctx.states.newSelectionHubState;

          ctx.patchShapes(ctx.getTmpShapeMap());
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          if (event.data.keys.has(line.id)) {
            return ctx.states.newSelectionHubState;
          }
          break;
        }
        case "keydown": {
          switch (event.data.key) {
            case "a": {
              ctx.patchUserSetting({ attachToLine: "off" });
              keepMoving = true;
              return { type: "break" };
            }
          }
          return;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const shapeComposite = ctx.getShapeComposite();
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();

      if (lineAnchor) {
        applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });
        renderCtx.beginPath();
        applyCurvePath(renderCtx, getLinePath(line), line.curves);
        renderCtx.stroke();

        if (!evenlyAligned) {
          const latestShape = shapeComposite.mergedShapeMap[option.shapeId];
          const latestAnchorP = getAttachmentAnchorPoint(shapeComposite, latestShape);
          const [localBounds] = shapeComposite.getLocalSpace(latestShape);
          applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * scale, dash: "long" });
          renderCtx.beginPath();
          renderCtx.arc(latestAnchorP.x, latestAnchorP.y, getDiagonalLengthOfRect(localBounds), 0, TAU);
          renderCtx.stroke();
        }

        applyFillStyle(renderCtx, { color: style.selectionSecondaly });
        renderCtx.beginPath();
        renderCtx.arc(lineAnchor.x, lineAnchor.y, 6 * scale, 0, TAU);
        renderCtx.fill();
      }

      if (snappingResult) {
        const shapeMap = shapeComposite.shapeMap;
        renderSnappingResult(renderCtx, {
          style,
          scale,
          result: snappingResult,
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeMap[id]),
        });
      }
    },
  };
}

function snapPointOnLine({
  line,
  shapeSnapping,
  movingRectAtStart,
  lineAnchorRate,
  lineAnchorP,
  anchorPointAtStart,
  edgeInfo,
}: {
  line: LineShape;
  shapeSnapping: ShapeSnapping;
  movingRectAtStart: IRectangle;
  lineAnchorRate: number;
  lineAnchorP: IVec2;
  anchorPointAtStart: IVec2;
  edgeInfo: LineEdgeInfo;
}):
  | {
      snappingResult: SnappingResult;
      lineAnchorRate: number;
      lineAnchor: IVec2;
    }
  | undefined {
  const anchorDiff = sub(lineAnchorP, anchorPointAtStart);
  const movingRect = moveRect(movingRectAtStart, anchorDiff);
  const result = shapeSnapping.test(movingRect);
  if (!result) return;

  // Get angle at the latest anchor point on the line.
  // Ignore guidelines parallel to this angle.
  const baseRadian = getPointLerpSlope(edgeInfo.lerpFn, lineAnchorRate);
  const baseVec = rotate({ x: 1, y: 0 }, baseRadian);
  const candidateTargets = result.targets.filter((t) => !isParallel(sub(t.line[1], t.line[0]), baseVec));

  // "lines" of "intervalTargets" represent the gaps between shapes.
  // => Perpendicular lines at vertices are the guideline candidates.
  const perpendicularVec = rotate(baseVec, Math.PI / 2);
  const candidateIntervals = result.intervalTargets.filter(
    (t) => t.lines.length > 0 && !isParallel(sub(t.lines[0][1], t.lines[0][0]), perpendicularVec),
  );

  const allCandidates: ISegment[] = candidateTargets.map((t) => t.line);
  candidateIntervals.forEach((t) =>
    t.lines.forEach((l) => {
      const v = rotate(sub(l[1], l[0]), Math.PI / 2);
      allCandidates.push([l[0], add(l[0], v)], [l[1], add(l[1], v)]);
    }),
  );
  const draftAnchor = add(anchorPointAtStart, add(result.diff, anchorDiff));
  const guideline = pickMinItem(allCandidates, (l) => getD2(sub(draftAnchor, getPedal(draftAnchor, l))));
  if (!guideline) return;

  const guidelineVec = sub(guideline[1], guideline[0]);
  const crossline: ISegment = [draftAnchor, add(guidelineVec, draftAnchor)];
  const intersections = getIntersectionsBetweenLineShapeAndLine(line, crossline);
  const nextLineAnchorP = pickMinItem(intersections, (p) => getD2(sub(p, draftAnchor)));
  if (!nextLineAnchorP) return;

  // The anchor point is getermined but stlll need to get its rate on the line.
  const closestInfo = getClosestOutlineInfoOfLineByEdgeInfo(edgeInfo, nextLineAnchorP, Infinity);
  if (!closestInfo) return;

  const perpendicularGuidelineVec = rotate(guidelineVec, Math.PI / 2);
  return {
    snappingResult: {
      diff: result.diff,
      targets: candidateTargets.filter((t) => isParallel(sub(t.line[1], t.line[0]), guidelineVec)),
      intervalTargets: candidateIntervals.filter(
        (t) => t.lines.length > 0 && isParallel(sub(t.lines[0][1], t.lines[0][0]), perpendicularGuidelineVec),
      ),
    },
    lineAnchorRate: closestInfo[1],
    lineAnchor: nextLineAnchorP,
  };
}
