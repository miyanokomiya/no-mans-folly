import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import {
  handleCommonShortcut,
  handleFileDrop,
  handleHistoryEvent,
  handleStateEvent,
  newShapeClipboard,
} from "./commons";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { newSelectionHubState } from "./selectionHubState";

export function newDefaultState(): AppCanvasState {
  return state;
}

const state: AppCanvasState = {
  getLabel: () => "Default",
  handleEvent: (ctx, event) => {
    switch (event.type) {
      case "pointerdown":
        switch (event.data.options.button) {
          case 0: {
            const shape = ctx.getShapeAt(event.data.point);
            if (shape) {
              ctx.selectShape(shape.id, event.data.options.ctrl);
              if (!event.data.options.ctrl) {
                if (event.data.options.alt) {
                  return newDuplicatingShapesState;
                } else {
                  return newSingleSelectedByPointerOnState;
                }
              }
              return newSelectionHubState;
            }

            return newRectangleSelectingState;
          }
          case 1:
            return newPanningState;
          case 2: {
            const shape = ctx.getShapeAt(event.data.point);
            if (!shape) return;

            ctx.selectShape(shape.id);
            return newSelectionHubState;
          }
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
        return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady", "TextReady"]);
      case "paste": {
        const clipboard = newShapeClipboard(ctx);
        clipboard.onPaste(event.nativeEvent);
        return;
      }
      case "file-drop": {
        handleFileDrop(ctx, event);
        return;
      }
      default:
        return;
    }
  },
};
