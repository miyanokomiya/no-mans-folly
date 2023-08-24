import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { getRect } from "../../../shapes";
import { translateOnSelection } from "./commons";

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

      const rect = getRect(ctx.getShapeStruct, shape);
      renderCtx.strokeStyle = "red";
      renderCtx.lineWidth = 2;
      renderCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    },
  };
}
