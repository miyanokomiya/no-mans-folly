import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { getLocalRectPolygon, getWrapperRect } from "../../../shapes";
import { handleHistoryEvent, handleStateEvent, translateOnSelection } from "./commons";
import * as geometry from "../../../utils/geometry";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { applyPath } from "../../../utils/renderer";
import { newMovingShapeState } from "./movingShapeState";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";

export function newMultipleSelectedState(): AppCanvasState {
  let selectedIds: { [id: string]: true };

  return {
    getLabel: () => "MultipleSelected",
    onStart: async (ctx) => {
      selectedIds = ctx.getSelectedShapeIdMap();
    },
    handleEvent: async (ctx, event) => {
      if (!selectedIds) return;

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
                if (selectedIds[shape.id]) {
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
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes(Object.keys(selectedIds));
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
      const style = ctx.getStyleScheme();
      const shapes = Object.entries(ctx.getShapeMap())
        .filter(([id]) => selectedIds[id])
        .map(([, s]) => s);

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly });
      renderCtx.lineWidth = 1;
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, getLocalRectPolygon(ctx.getShapeStruct, s), true));
      renderCtx.stroke();

      const rect = geometry.getWrapperRect(shapes.map((s) => getWrapperRect(ctx.getShapeStruct, s)));
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.lineWidth = 2;
      renderCtx.beginPath();
      renderCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    },
  };
}
