import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { mapReduce, patchPipe, toList, toMap } from "../../../../utils/commons";
import { getLinePath, isLineShape, LineShape } from "../../../../shapes/line";
import { getClosestOutlineInfoOfLine, getLineEdgeInfo } from "../../../../shapes/utils/line";
import { getDiagonalLengthOfRect, TAU } from "../../../../utils/geometry";
import { add, getDistance, IVec2, sub } from "okageo";
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
  let edgeInfo: ReturnType<typeof getLineEdgeInfo>;
  let anchorPointAtStart: IVec2;
  let pointAtStart: IVec2;
  let patchAtStart: { [id: string]: Partial<Shape> };
  let evenlyAligned = false;

  function storeAtStart(ctx: AppCanvasStateContext) {
    pointAtStart = ctx.getCursorPoint();
    patchAtStart = ctx.getTmpShapeMap();
    const shapeComposite = ctx.getShapeComposite();
    const nextShapeComposite = getNextShapeComposite(shapeComposite, { update: patchAtStart });
    anchorPointAtStart = getAttachmentAnchorPoint(nextShapeComposite, nextShapeComposite.shapeMap[option.shapeId]);
  }

  return {
    getLabel: () => "MovingOnLine",
    onStart: (ctx) => {
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP, COMMAND_EXAM_SRC.EVENLY_SPACED]);

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      line = shapeMap[option.lineId] as LineShape;
      if (!isLineShape(line)) {
        keepMoving = true;
        return { type: "break" };
      }

      edgeInfo = getLineEdgeInfo(line);
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
          if (event.data.ctrl) {
            keepMoving = true;
            return { type: "break" };
          }

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

          const movedIndexAnchorP = add(anchorPointAtStart, sub(event.data.current, pointAtStart));
          const closestInfo = getClosestOutlineInfoOfLine(line, movedIndexAnchorP, Infinity);
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
          }

          const patch = patchPipe(
            [
              (src) => {
                return mapReduce(src, (s) => {
                  const info = attachInfoMap.get(s.id)!;
                  const attachment: ShapeAttachment = {
                    anchor: { x: 0.5, y: 0.5 },
                    rotationType: "relative",
                    rotation: 0,
                    // Inherit both source and temporary attachment to preserve attachment state as much as possible.
                    // => Attachment can be deleted in temporary data so "mergedShapeMap" doesn't work for this purpose.
                    ...shapeMap[s.id].attachment,
                    ...patchAtStart[s.id]?.attachment,
                    id: line.id,
                    to: info[0],
                  };
                  return { ...patchAtStart[s.id], attachment };
                });
              },
              (_, currentPatch) => {
                return getPatchAfterLayouts(shapeComposite, { update: currentPatch });
              },
            ],
            toMap(Array.from(attachInfoMap.keys()).map((id) => shapeMap[id])),
          );
          ctx.setTmpShapeMap(patch.patch);

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
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();

      if (lineAnchor) {
        applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });
        renderCtx.beginPath();
        applyCurvePath(renderCtx, getLinePath(line), line.curves);
        renderCtx.stroke();

        if (!evenlyAligned) {
          const shapeComposite = ctx.getShapeComposite();
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
    },
  };
}
