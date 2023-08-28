import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { newMovingShapeState } from "./movingShapeState";
import { getDistance } from "okageo";

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
          if (getDistance(event.data.current, event.data.start) < 4 * ctx.getScale()) return;
          return newMovingShapeState;
        case "pointerup":
          return translateOnSelection(ctx);
        case "selection": {
          return translateOnSelection(ctx);
        }
        default:
          return;
      }
    },
  };
}
