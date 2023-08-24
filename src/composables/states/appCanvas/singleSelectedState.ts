import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { getLocalRectPolygon } from "../../../shapes";
import { translateOnSelection } from "./commons";
import { applyStrokeStyle } from "../../../utils/strokeStyle";

export function newSingleSelectedState(): AppCanvasState {
  let selectedId: string | undefined;

  return {
    getLabel: () => "SingleSelected",
    onStart: async (ctx) => {
      selectedId = ctx.getLastSelectedShapeId();
    },
    handleEvent: async (ctx, event) => {
      if (!selectedId) return;

      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const shape = ctx.getShapeAt(event.data.point);
              if (shape) {
                ctx.selectShape(shape.id, event.data.options.ctrl);
              } else {
                ctx.clearAllSelected();
              }
              return;
            }
            case 1:
              return { type: "stack-restart", getState: newPanningState };
            default:
              return;
          }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes([selectedId]);
              return;
            default:
              return;
          }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        case "selection": {
          return translateOnSelection(ctx);
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const shape = ctx.getShapeMap()[selectedId ?? ""];
      if (!shape) return;

      const style = ctx.getStyleScheme();
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.lineWidth = 2;
      renderCtx.beginPath();
      getLocalRectPolygon(ctx.getShapeStruct, shape).forEach((p) => {
        renderCtx.lineTo(p.x, p.y);
      });
      renderCtx.closePath();
      renderCtx.stroke();
    },
  };
}
