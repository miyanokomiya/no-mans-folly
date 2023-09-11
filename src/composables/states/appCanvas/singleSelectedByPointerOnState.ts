import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { newMovingShapeState } from "./movingShapeState";
import { getDistance } from "okageo";
import { newBoundingBox } from "../../boundingBox";
import { getLocalRectPolygon } from "../../../shapes";

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

          const boundingBox = newBoundingBox({
            path: getLocalRectPolygon(ctx.getShapeStruct, shape),
            styleScheme: ctx.getStyleScheme(),
            scale: ctx.getScale(),
          });
          return () => newMovingShapeState({ boundingBox });
        }
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
