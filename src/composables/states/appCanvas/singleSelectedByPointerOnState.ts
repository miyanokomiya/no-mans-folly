import type { AppCanvasState } from "./core";
import { getDistance } from "okageo";
import { startTextEditingIfPossible } from "./commons";
import { isRigidMoveShape } from "../../../shapes";

interface Option {
  concurrent?: boolean; // Set true, when the target shape has already been selected.
}

export function newSingleSelectedByPointerOnState(option?: Option): AppCanvasState {
  let timestamp = 0;

  return {
    getLabel: () => "SingleSelectedByPointerOn",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      ctx.startDragging();
      timestamp = Date.now();
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (Date.now() - timestamp < 100 && getDistance(event.data.current, event.data.start) < 8 * ctx.getScale())
            return;

          const shapeComposite = ctx.getShapeComposite();
          const shape = shapeComposite.shapeMap[ctx.getLastSelectedShapeId() ?? ""];
          if (!shape) {
            return ctx.states.newSelectionHubState;
          }

          if (shapeComposite.attached(shape) && event.data.shift) {
            const lineId = shape.attachment.id;
            return () =>
              ctx.states.newMovingAnchorOnLineState({
                lineId,
                shapeId: shape.id,
              });
          }

          if (!option?.concurrent && isRigidMoveShape(shapeComposite.getShapeStruct, shape)) return;

          return ctx.states.newMovingHubState;
        }
        case "pointerup": {
          if (option?.concurrent && Date.now() - timestamp < 200) {
            const result = startTextEditingIfPossible(ctx, ctx.getLastSelectedShapeId(), event.data.point);
            if (result) return result;
          }

          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        default:
          return;
      }
    },
  };
}
