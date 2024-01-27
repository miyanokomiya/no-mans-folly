import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import {
  getCommonCommandExams,
  getInlineLinkInfoAt,
  handleCommonShortcut,
  handleCommonWheel,
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
  onStart(ctx) {
    ctx.setCommandExams(getCommonCommandExams(ctx));
  },
  onEnd(ctx) {
    ctx.setCommandExams();
    ctx.setLinkInfo();
  },
  handleEvent: (ctx, event) => {
    switch (event.type) {
      case "pointerdown":
        switch (event.data.options.button) {
          case 0: {
            const shapeComposite = ctx.getShapeComposite();
            const shape = shapeComposite.findShapeAt(event.data.point);
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
            const shapeComposite = ctx.getShapeComposite();
            const shape = shapeComposite.findShapeAt(event.data.point);
            if (!shape) return;

            ctx.selectShape(shape.id);
            return newSelectionHubState;
          }
          default:
            return;
        }
      case "pointerhover": {
        const shapeComposite = ctx.getShapeComposite();
        const shape = shapeComposite.findShapeAt(event.data.current);

        if (shape) {
          const linkInfo = getInlineLinkInfoAt(ctx, shape, event.data.current);
          ctx.setCursor(linkInfo ? "pointer" : undefined);
          ctx.setLinkInfo(linkInfo);
        } else {
          ctx.setCursor(undefined);
        }
        return;
      }
      case "keydown":
        return handleCommonShortcut(ctx, event);
      case "wheel":
        handleCommonWheel(ctx, event);
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
