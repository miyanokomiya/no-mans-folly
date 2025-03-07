import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { mapReduce, patchPipe, toList, toMap } from "../../../../utils/commons";
import { getLinePath, isLineShape, LineShape } from "../../../../shapes/line";
import { getLineEdgeInfo } from "../../../../shapes/utils/line";
import { getDiagonalLengthOfRect, TAU } from "../../../../utils/geometry";
import { add, getDistance, IRectangle, IVec2, moveRect, sub } from "okageo";
import {
  getAttachmentAnchorPoint,
  getEvenlySpacedLineAttachment,
  getEvenlySpacedLineAttachmentBetweenFixedOnes,
  snapRectWithLineAttachment,
} from "../../../lineAttachmentHandler";
import { Shape, ShapeAttachment } from "../../../../models";
import { applyCurvePath } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { getNextShapeComposite } from "../../../shapeComposite";
import { newShapeSnapping, renderSnappingResult, ShapeSnapping, SnappingResult } from "../../../shapeSnapping";
import { getSnappableCandidates } from "../commons";
import { getClosestPointOnPolyline, PolylineEdgeInfo } from "../../../../utils/path";

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
  let edgeInfo: PolylineEdgeInfo;
  let anchorPointAtStart: IVec2;
  let pointAtStart: IVec2;
  let patchAtStart: { [id: string]: Partial<Shape> };
  let evenlyAligned = false;

  // Shape snapping doesn't work well when the index shape rotates along the line.
  // => It's still convenient most of time.
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let movingRectAtStart: IRectangle;

  function storeAtStart(ctx: AppCanvasStateContext) {
    pointAtStart = ctx.getCursorPoint();
    patchAtStart = ctx.getTmpShapeMap();
    const shapeComposite = ctx.getShapeComposite();
    const nextShapeComposite = getNextShapeComposite(shapeComposite, { update: patchAtStart });
    anchorPointAtStart = getAttachmentAnchorPoint(nextShapeComposite, nextShapeComposite.shapeMap[option.shapeId]);
    movingRectAtStart = nextShapeComposite.getWrapperRect(nextShapeComposite.shapeMap[option.shapeId]);
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
      const snappableCandidates = getSnappableCandidates(ctx, selectedIds);
      const snappableShapes = shapeComposite.getShapesOverlappingRect(
        snappableCandidates.filter((s) => !isLineShape(s)),
        ctx.getViewRect(),
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        gridSnapping: ctx.getGrid().getSnappingLines(),
        settings: ctx.getUserSetting(),
      });

      ctx.setCommandExams([
        COMMAND_EXAM_SRC.DISABLE_SNAP,
        COMMAND_EXAM_SRC.ATTACH_TO_LINE_OFF,
        COMMAND_EXAM_SRC.EVENLY_SPACED,
      ]);

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
          const closestInfo = getClosestPointOnPolyline(edgeInfo, movedIndexAnchorP, Infinity);
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
            let nextTo = { x: closestInfo[1], y: 0 };
            lineAnchor = closestInfo[0];
            attachInfoMap = new Map([[option.shapeId, [nextTo]]]);

            const scale = ctx.getScale();
            const movingRect = moveRect(movingRectAtStart, sub(lineAnchor, anchorPointAtStart));
            const shapeSnappingResult = shapeSnapping.test(movingRect, undefined, scale);
            snappingResult = undefined;
            if (!event.data.ctrl && shapeSnappingResult) {
              const result = snapRectWithLineAttachment({
                line,
                edgeInfo,
                snappingResult: shapeSnappingResult,
                movingRect,
                movingRectAnchorRate: closestInfo[1],
                movingRectAnchor: lineAnchor,
                scale,
              });
              if (result) {
                snappingResult = result.snappingResult;
                lineAnchor = result.lineAnchor;
                nextTo = { x: result.lineAnchorRate, y: 0 };
                attachInfoMap = new Map([[option.shapeId, [nextTo]]]);
              }
            }

            if (selectedShapes.length > 1) {
              const infoMap = getEvenlySpacedLineAttachmentBetweenFixedOnes(
                shapeMap,
                line.id,
                Object.keys(selectedShapeMap),
                option.shapeId,
                nextTo.x,
              );
              for (const [k, v] of infoMap) {
                attachInfoMap.set(k, v);
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
        const shapeMap = shapeComposite.mergedShapeMap;
        renderSnappingResult(renderCtx, {
          style,
          scale,
          result: snappingResult,
          getTargetRect: (id) => (shapeMap[id] ? shapeComposite.getWrapperRect(shapeMap[id]) : undefined),
        });
      }
    },
  };
}
