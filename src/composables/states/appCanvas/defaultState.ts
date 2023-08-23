import type { AppCanvasState, AppCanvasStateContext } from "./core";
import { newPanningState } from "../commons";

export function newDefaultState(): AppCanvasState {
  return state;
}

const state: AppCanvasState = {
  getLabel: () => "Default",
  onStart: async (ctx) => {
    onChangeSelection(ctx);
  },
  handleEvent: async (ctx, event) => {
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
            return newPanningState;
          default:
            return;
        }
      case "wheel":
        ctx.zoomView(event.data.delta.y);
        return;
      default:
        return;
    }
  },
};

function onChangeSelection(_ctx: AppCanvasStateContext) {
  return;
}
