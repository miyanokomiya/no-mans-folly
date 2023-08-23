import type { AppCanvasState, AppCanvasStateContext } from "./core";
import { newPanningState } from "../commons";
import { getRect } from "../../../shapes";
import { getWrapperRect } from "../../../utils/geometry";

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
  render: (ctx, renderCtx) => {
    const selected = ctx.getSelectedShapeIdMap();
    const shapes = Object.entries(ctx.getShapeMap())
      .filter(([id]) => selected[id])
      .map(([, s]) => s);
    const rect = getWrapperRect(shapes.map((s) => getRect(ctx.getShapeStruct, s)));
    renderCtx.strokeStyle = "red";
    renderCtx.lineWidth = 2;
    renderCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  },
};

function onChangeSelection(_ctx: AppCanvasStateContext) {
  return;
}
