import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { getLocalRectPolygon } from "../../../shapes";
import { handleHistoryEvent, handleStateEvent, translateOnSelection } from "./commons";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { newMovingShapeState } from "./movingShapeState";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";

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
              if (!shape) {
                ctx.clearAllSelected();
                return;
              }

              if (!event.data.options.ctrl) {
                if (shape.id === selectedId) {
                  return newMovingShapeState;
                } else {
                  ctx.selectShape(shape.id, false);
                  return newSingleSelectedByPointerOnState;
                }
              }

              ctx.selectShape(shape.id, true);
              return;
            }
            case 1:
              return { type: "stack-restart", getState: newPanningState };
            default:
              return;
          }
        case "pointermove":
          return { type: "stack-restart", getState: newMovingShapeState };
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
        case "history":
          return handleHistoryEvent(ctx, event);
        case "state":
          return handleStateEvent(event, ["DroppingNewShape"]);
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
