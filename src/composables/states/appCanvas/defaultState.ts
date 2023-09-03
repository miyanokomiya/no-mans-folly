import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import {
  handleCommonShortcut,
  handleHistoryEvent,
  handleStateEvent,
  newShapeClipboard,
  translateOnSelection,
} from "./commons";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { newRectangleSelectingState } from "./ractangleSelectingState";

export function newDefaultState(): AppCanvasState {
  return state;
}

const state: AppCanvasState = {
  getLabel: () => "Default",
  handleEvent: async (ctx, event) => {
    switch (event.type) {
      case "pointerdown":
        switch (event.data.options.button) {
          case 0: {
            const shape = ctx.getShapeAt(event.data.point);
            if (shape) {
              ctx.selectShape(shape.id, event.data.options.ctrl);
              if (!event.data.options.ctrl) {
                return newSingleSelectedByPointerOnState;
              }
              return translateOnSelection(ctx);
            }

            return newRectangleSelectingState;
          }
          case 1:
            return newPanningState;
          default:
            return;
        }
      case "pointerhover": {
        const shape = ctx.getShapeAt(event.data.current);
        ctx.setCursor(shape ? "pointer" : undefined);
        return;
      }
      case "keydown":
        return handleCommonShortcut(ctx, event);
      case "wheel":
        ctx.zoomView(event.data.delta.y);
        return;
      case "history":
        return handleHistoryEvent(ctx, event);
      case "state":
        return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady"]);
      case "paste": {
        const clipboard = newShapeClipboard(ctx);
        clipboard.onPaste(event.nativeEvent);
        return;
      }
      default:
        return;
    }
  },
};
