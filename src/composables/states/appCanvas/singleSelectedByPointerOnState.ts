import type { AppCanvasState } from "./core";
import { newMovingShapeState } from "./movingShapeState";
import { getDistance } from "okageo";
import { newBoundingBox } from "../../boundingBox";
import { getLocalRectPolygon } from "../../../shapes";
import { newSelectionHubState } from "./selectionHubState";
import { isLineLabelShape } from "../../../shapes/text";
import { newMovingLineLabelState } from "./lines/movingLineLabelState";

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

          const shape = ctx.getShapeMap()[ctx.getLastSelectedShapeId() ?? ""];
          if (!shape) {
            return newSelectionHubState;
          }

          const boundingBox = newBoundingBox({
            path: getLocalRectPolygon(ctx.getShapeStruct, shape),
            styleScheme: ctx.getStyleScheme(),
            scale: ctx.getScale(),
          });

          if (isLineLabelShape(shape)) {
            return () => newMovingLineLabelState({ boundingBox });
          }

          return () => newMovingShapeState({ boundingBox });
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
