import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { newMovingShapeState } from "./movingShapeState";
import { newSingleSelectedState } from "./singleSelectedState";

export function newSingleSelectedByPointerOnState(): AppCanvasState {
  return {
    getLabel: () => "SingleSelectedByPointerOn",
    onStart: async (ctx) => {
      ctx.startDragging();
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove":
          return newMovingShapeState;
        case "pointerup":
          return newSingleSelectedState;
        case "selection": {
          return translateOnSelection(ctx);
        }
        default:
          return;
      }
    },
  };
}
