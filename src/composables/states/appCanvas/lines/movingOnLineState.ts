import type { AppCanvasState } from "../core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { mapReduce, patchPipe, toList } from "../../../../utils/commons";
import { isLineShape, LineShape } from "../../../../shapes/line";
import { getClosestOutlineInfoOfLine, getLineEdgeInfo } from "../../../../shapes/utils/line";
import { TAU } from "../../../../utils/geometry";
import { IVec2, lerpPoint } from "okageo";
import { patchByMoveToAttachedPoint } from "../../../lineAttachmentHandler";
import { ShapeAttachment } from "../../../../models";

type Option = {
  lineId: string;
  shapeId: string;
};

export function newMovingOnLineState(option: Option): AppCanvasState {
  let keepMoving = false;
  let lineAnchor: IVec2 | undefined;
  let lineLerpFn: (t: number) => IVec2;

  return {
    getLabel: () => "MovingOnLine",
    onStart: (ctx) => {
      // ctx.setTmpShapeMap({});
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const line = shapeMap[option.lineId] as LineShape;
      lineLerpFn = getLineEdgeInfo(line).lerpFn;
    },
    onEnd: (ctx) => {
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

          const p = event.data.current;
          const shapeComposite = ctx.getShapeComposite();
          const shapeMap = shapeComposite.shapeMap;
          const line = shapeMap[option.lineId];
          if (!isLineShape(line)) {
            keepMoving = true;
            return { type: "break" };
          }

          const closestInfo = getClosestOutlineInfoOfLine(line, p, 40 * ctx.getScale());
          if (!closestInfo) {
            keepMoving = true;
            return { type: "break" };
          }

          const baseToP = closestInfo[0];
          lineAnchor = baseToP;
          const baseTo = { x: closestInfo[1], y: 0 };

          const selectedShapeMap = mapReduce(ctx.getSelectedShapeIdMap(), (_, id) => shapeMap[id]);
          const selectedShapes = toList(selectedShapeMap);
          const attachInfoMap = new Map<string, [to: IVec2, toP: IVec2]>([[option.shapeId, [baseTo, baseToP]]]);

          if (selectedShapes.length > 1) {
            const toLerpFn = (t: number) => lerpPoint(baseTo, { x: 1, y: 0 }, t);
            const step = 1 / selectedShapes.length;
            selectedShapes
              .filter((s) => s.id !== option.shapeId)
              .forEach((s, i) => {
                const to = toLerpFn(step * (i + 1));
                attachInfoMap.set(s.id, [to, lineLerpFn(to.x)]);
              });
          }

          const patch = patchPipe(
            [
              (src) => {
                return mapReduce(src, (s) => {
                  const info = attachInfoMap.get(s.id)!;
                  const attachment: ShapeAttachment = {
                    id: line.id,
                    to: info[0],
                    anchor: { x: 0.5, y: 0.5 },
                    rotationType: "relative",
                    rotation: 0,
                  };
                  return {
                    ...patchByMoveToAttachedPoint(shapeComposite, s, attachment.anchor, info[1]),
                    attachment,
                  };
                });
              },
            ],
            selectedShapeMap,
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
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();

      if (lineAnchor) {
        applyFillStyle(renderCtx, { color: style.selectionPrimary });
        renderCtx.beginPath();
        renderCtx.arc(lineAnchor.x, lineAnchor.y, 10 * scale, 0, TAU);
        renderCtx.fill();
      }
    },
  };
}
