import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import { handleHistoryEvent, handleStateEvent, translateOnSelection } from "../commons";
import { newSingleSelectedByPointerOnState } from "../singleSelectedByPointerOnState";
import { newRectangleSelectingState } from "../ractangleSelectingState";
import { LineShape } from "../../../../shapes/line";
import { LineBounding, newLineBounding } from "../../../lineBounding";
import { newMovingLineVertexState } from "./movingLineVertexState";
import { newMovingShapeState } from "../movingShapeState";

export function newLineSelectedState(): AppCanvasState {
  let lineShape: LineShape;
  let lineBounding: LineBounding;

  return {
    getLabel: () => "LineSelected",
    onStart: async (ctx) => {
      lineShape = ctx.getShapeMap()[ctx.getLastSelectedShapeId() ?? ""] as LineShape;
      lineBounding = newLineBounding({ lineShape, scale: ctx.getScale(), styleScheme: ctx.getStyleScheme() });
    },
    onEnd: async (ctx) => {
      ctx.setCursor();
    },
    handleEvent: async (ctx, event) => {
      if (!lineShape) return translateOnSelection(ctx);

      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const hitResult = lineBounding.hitTest(event.data.point);
              if (hitResult) {
                switch (hitResult.type) {
                  case "vertex":
                    return () => newMovingLineVertexState({ lineShape, index: hitResult.index });
                  case "edge":
                    return newMovingShapeState;
                }
              }

              const shape = ctx.getShapeAt(event.data.point);
              if (!shape) {
                return () => newRectangleSelectingState({ keepSelection: event.data.options.ctrl });
              }

              if (!event.data.options.ctrl) {
                if (shape.id === lineShape.id) {
                  return;
                } else {
                  ctx.selectShape(shape.id, false);
                  return newSingleSelectedByPointerOnState;
                }
              }

              ctx.selectShape(shape.id, true);
              return;
            }
            case 1:
              return { type: "stack-restart", getState: newPanningState };
            default:
              return;
          }
        case "pointerhover": {
          const hitResult = lineBounding.hitTest(event.data.current);
          if (lineBounding.saveHitResult(hitResult)) {
            ctx.setTmpShapeMap({});
          }
          if (hitResult) {
            ctx.setCursor();
            return;
          }

          const shape = ctx.getShapeAt(event.data.current);
          ctx.setCursor(shape && shape.id !== lineShape.id ? "pointer" : undefined);
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes([lineShape.id]);
              return;
            default:
              return;
          }
        case "wheel":
          lineBounding.updateScale(ctx.zoomView(event.data.delta.y));
          return;
        case "selection": {
          return translateOnSelection(ctx);
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return translateOnSelection(ctx);
        case "state":
          return handleStateEvent(event, ["DroppingNewShape", "LineReady"]);
        default:
          return;
      }
    },
    render: (_ctx, renderCtx) => {
      lineBounding.render(renderCtx);
    },
  };
}
