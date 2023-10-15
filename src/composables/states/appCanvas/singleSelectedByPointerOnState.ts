import type { AppCanvasState } from "./core";
import { getDistance } from "okageo";
import { newSelectionHubState } from "./selectionHubState";
import { newMovingHubState } from "./movingHubState";

export function newSingleSelectedByPointerOnState(): AppCanvasState {
  return {
    getLabel: () => "SingleSelectedByPointerOn",
    onStart: (ctx) => {
      ctx.hideFloatMenu();
      ctx.startDragging();
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (getDistance(event.data.current, event.data.start) < 4 * ctx.getScale()) return;

          const shapeComposite = ctx.getShapeComposite();
          const shape = shapeComposite.shapeMap[ctx.getLastSelectedShapeId() ?? ""];
          if (!shape) {
            return newSelectionHubState;
          }

          return newMovingHubState;
        }
        case "pointerup":
          return newSelectionHubState;
        case "selection": {
          return newSelectionHubState;
        }
        default:
          return;
      }
    },
  };
}
