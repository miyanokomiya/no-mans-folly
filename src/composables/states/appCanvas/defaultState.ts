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
          case 1:
            return newPanningState;
          default:
            return;
        }
      default:
        return;
    }
  },
};

function onChangeSelection(_ctx: AppCanvasStateContext) {
  return;
}
