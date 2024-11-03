import type { AppCanvasState } from "../core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { mapReduce, patchPipe, toList, toMap } from "../../../../utils/commons";
import { getLinePath, isLineShape, LineShape } from "../../../../shapes/line";
import { getClosestOutlineInfoOfLine, getLineEdgeInfo } from "../../../../shapes/utils/line";
import { TAU } from "../../../../utils/geometry";
import { add, IVec2, sub } from "okageo";
import {
  getAttachmentAnchorPoint,
  getEvenlySpacedLineAttachment,
  getEvenlySpacedLineAttachmentBetweenFixedOnes,
} from "../../../lineAttachmentHandler";
import { ShapeAttachment } from "../../../../models";
import { applyCurvePath } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newMovingAnchorOnLineState } from "./movingAnchorOnLineState";
import { ShapeComposite } from "../../../shapeComposite";

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
  let anchorP: IVec2;
  let pointAtStart: IVec2;

  function storeAnchor(shapeComposite: ShapeComposite) {
    const latestShape = shapeComposite.mergedShapeMap[option.shapeId];
    anchorP = getAttachmentAnchorPoint(shapeComposite, latestShape);
  }

  return {
    getLabel: () => "MovingOnLine",
    onStart: (ctx) => {
      ctx.setCommandExams([
        COMMAND_EXAM_SRC.DISABLE_SNAP,
        COMMAND_EXAM_SRC.EVENLY_SPACED,
        COMMAND_EXAM_SRC.SLIDE_ATTACH_ANCHOR,
      ]);

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      line = shapeMap[option.lineId] as LineShape;
      if (!isLineShape(line)) {
        keepMoving = true;
        return { type: "break" };
      }

      edgeInfo = getLineEdgeInfo(line);
      storeAnchor(shapeComposite);
      pointAtStart = ctx.getCursorPoint();
    },
    onResume: (ctx) => {
      ctx.setCommandExams([
        COMMAND_EXAM_SRC.DISABLE_SNAP,
        COMMAND_EXAM_SRC.EVENLY_SPACED,
        COMMAND_EXAM_SRC.SLIDE_ATTACH_ANCHOR,
      ]);
      storeAnchor(ctx.getShapeComposite());
      pointAtStart = ctx.getCursorPoint();
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

          const indexShape = shapeMap[option.shapeId];
          const latestShape = shapeComposite.mergedShapeMap[indexShape.id];
          const diff = sub(event.data.current, pointAtStart);
          const movedIndexAnchorP = add(anchorP, diff);

          if (event.data.alt) {
            if (shapeComposite.attached(latestShape)) {
              return { type: "stack-resume", getState: () => newMovingAnchorOnLineState(option) };
            }
          }

          const closestInfo = getClosestOutlineInfoOfLine(line, movedIndexAnchorP, 40 * ctx.getScale());
          if (!closestInfo) {
            keepMoving = true;
            return { type: "break" };
          }

          const selectedShapeMap = mapReduce(ctx.getSelectedShapeIdMap(), (_, id) => shapeMap[id]);
          const selectedShapes = toList(selectedShapeMap);
          let attachInfoMap: Map<string, [to: IVec2]>;

          if (event.data.shift) {
            const attachInfo = getEvenlySpacedLineAttachment(
              shapeComposite.shapeMap,
              line.id,
              Object.keys(selectedShapeMap),
              indexShape.id,
              movedIndexAnchorP,
              edgeInfo,
            );
            attachInfoMap = attachInfo.attachInfoMap;
            lineAnchor = attachInfo.attachedPoint;
          } else {
            const baseTo = { x: closestInfo[1], y: 0 };
            const baseToP = closestInfo[0];
            lineAnchor = baseToP;
            attachInfoMap = new Map<string, [to: IVec2]>([[option.shapeId, [baseTo]]]);

            if (selectedShapes.length > 1) {
              const infoMap = getEvenlySpacedLineAttachmentBetweenFixedOnes(
                shapeComposite.shapeMap,
                line.id,
                Object.keys(selectedShapeMap),
                indexShape.id,
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
                    ...shapeComposite.shapeMap[s.id].attachment,
                    ...shapeComposite.tmpShapeMap[s.id]?.attachment,
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

        applyFillStyle(renderCtx, { color: style.selectionSecondaly });
        renderCtx.beginPath();
        renderCtx.arc(lineAnchor.x, lineAnchor.y, 6 * scale, 0, TAU);
        renderCtx.fill();
      }
    },
  };
}
