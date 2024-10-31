import type { AppCanvasState } from "../core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { mapReduce, patchPipe } from "../../../../utils/commons";
import { isLineShape } from "../../../../shapes/line";
import { getClosestOutlineInfoOfLine } from "../../../../shapes/utils/line";
import { TAU } from "../../../../utils/geometry";
import { IVec2 } from "okageo";

export function newMovingOnLineState(option: { lineId: string }): AppCanvasState {
  let keepMoving = false;
  let lineAnchor: IVec2 | undefined;

  return {
    getLabel: () => "MovingOnLine",
    onStart: (ctx) => {
      // ctx.setTmpShapeMap({});
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

          const anchor = { x: 0.5, y: 0.5 };
          const closestInfo = getClosestOutlineInfoOfLine(line, p, 40 * ctx.getScale());
          if (!closestInfo) {
            keepMoving = true;
            return { type: "break" };
          }

          const toP = closestInfo[0];
          lineAnchor = toP;
          const to = { x: closestInfo[1], y: 0 };
          const selectedShapeMap = mapReduce(ctx.getSelectedShapeIdMap(), (_, id) => shapeMap[id]);
          const patch = patchPipe(
            [
              (src) => {
                return mapReduce(src, (s) => {
                  const bounds = shapeComposite.getWrapperRect(s);
                  const anchorP = { x: bounds.x + bounds.width * anchor.x, y: bounds.y + bounds.height * anchor.y };
                  return {
                    ...shapeComposite.transformShape(s, [1, 0, 0, 1, toP.x - anchorP.x, toP.y - anchorP.y]),
                    attachment: {
                      id: line.id,
                      to,
                      anchor: { x: 0.5, y: 0 },
                      rotationType: "relative",
                      rotation: 0,
                    } as const,
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
