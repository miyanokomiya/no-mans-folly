import type { AppCanvasState } from "./core";
import { newMovingShapeState } from "./movingShapeState";
import { getDistance } from "okageo";
import { newBoundingBox } from "../../boundingBox";
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

          const shapeComposite = ctx.getShapeComposite();
          const shape = shapeComposite.shapeMap[ctx.getLastSelectedShapeId() ?? ""];
          if (!shape) {
            return newSelectionHubState;
          }

          const boundingBox = newBoundingBox({
            path: shapeComposite.getLocalRectPolygon(shape),
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
