import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { getRect } from "../../../shapes";
import { translateOnSelection } from "./commons";
import { getWrapperRect } from "../../../utils/geometry";

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
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const shapes = Object.entries(ctx.getShapeMap())
        .filter(([id]) => selectedIds[id])
        .map(([, s]) => s);
      const rect = getWrapperRect(shapes.map((s) => getRect(ctx.getShapeStruct, s)));
      renderCtx.strokeStyle = "red";
      renderCtx.lineWidth = 2;
      renderCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    },
  };
}
