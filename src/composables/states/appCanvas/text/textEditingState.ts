import { applyAffine } from "okageo";
import { getShapeTextBounds } from "../../../../shapes";
import { TextEditorController, newTextEditorController } from "../../../textEditor";
import { handleHistoryEvent, handleStateEvent, translateOnSelection } from "../commons";
import { AppCanvasState, AppCanvasStateContext } from "../core";
import { newTextSelectingState } from "./textSelectingState";

interface Option {
  id: string;
  textEditorController?: TextEditorController;
}

export function newTextEditingState(option: Option): AppCanvasState {
  let textEditorController: TextEditorController;
  let textBounds: ReturnType<typeof getShapeTextBounds>;

  function updateEditorPosition(ctx: AppCanvasStateContext) {
    if (!textEditorController || !applyAffine) return;

    const bounds = textEditorController.getBoundsAtCursor();
    if (!bounds) return;

    const p = { x: bounds.x, y: bounds.y + bounds.height };
    ctx.setTextEditorPosition(applyAffine(textBounds.affine, p));
  }

  return {
    getLabel: () => "TextEditing",
    onStart: async (ctx) => {
      ctx.startTextEditing();

      const shape = ctx.getShapeMap()[option.id];
      textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);

      if (option.textEditorController) {
        textEditorController = option.textEditorController;
      } else {
        textEditorController = newTextEditorController();
        textEditorController.setDoc(ctx.getDocumentMap()[option.id], textBounds.range);
        textEditorController.moveCursorToTail();
      }

      updateEditorPosition(ctx);

      ctx.setCaptureTimeout(1000);
    },
    onEnd: async (ctx) => {
      ctx.stopTextEditing();
      ctx.setCaptureTimeout();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "text-input": {
          const cursor = textEditorController.getCursor();
          ctx.patchDocument(option.id, textEditorController.getDeltaByInput(event.data.value));
          textEditorController.setCursor(cursor + event.data.value.length);
          return;
        }
        case "pointerdown": {
          const shape = ctx.getShapeAt(event.data.point);
          if (shape?.id !== option.id) {
            shape ? ctx.selectShape(shape.id, event.data.options.ctrl) : ctx.clearAllSelected();
            return translateOnSelection(ctx);
          }

          const location = textEditorController.getLocationAt(applyAffine(textBounds.affineReverse, event.data.point));
          textEditorController.setCursor(textEditorController.getLocationIndex(location));
          updateEditorPosition(ctx);
          return () => newTextSelectingState({ id: option.id, textEditorController });
        }
        case "keydown":
          updateEditorPosition(ctx);
          switch (event.data.key) {
            case "ArrowLeft":
              if (event.data.shift) {
                textEditorController.shiftSelectionBy(-1);
              } else {
                textEditorController.shiftCursorBy(-1);
              }
              ctx.setTmpShapeMap({});
              return;
            case "ArrowRight": {
              if (event.data.shift) {
                textEditorController.shiftSelectionBy(1);
              } else {
                textEditorController.shiftCursorBy(1);
              }
              ctx.setTmpShapeMap({});
              return;
            }
            case "ArrowUp":
              textEditorController.moveCursorUp();
              ctx.setTmpShapeMap({});
              return;
            case "ArrowDown":
              textEditorController.moveCursorDown();
              ctx.setTmpShapeMap({});
              return;
            case "Backspace": {
              const cursor = textEditorController.getCursor();
              const selection = textEditorController.getSelection();
              if (selection > 0) {
                ctx.patchDocument(option.id, [{ retain: cursor }, { delete: Math.max(1, selection) }]);
                textEditorController.setCursor(cursor);
              } else {
                ctx.patchDocument(option.id, [{ retain: cursor - 1 }, { delete: 1 }]);
                textEditorController.setCursor(cursor - 1);
              }
              return;
            }
            case "Delete": {
              const cursor = textEditorController.getCursor();
              const selection = textEditorController.getSelection();
              if (selection > 0) {
                ctx.patchDocument(option.id, [{ retain: cursor }, { delete: Math.max(1, selection) }]);
                textEditorController.setCursor(cursor);
              } else {
                ctx.patchDocument(option.id, [{ retain: cursor }, { delete: 1 }]);
                textEditorController.setCursor(cursor);
              }
              return;
            }
          }
          return;
        case "shape-updated": {
          const shape = ctx.getShapeMap()[option.id];
          if (!shape) return translateOnSelection(ctx);

          textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);
          textEditorController.setDoc(ctx.getDocumentMap()[option.id], textBounds.range);
          return;
        }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        case "selection": {
          return translateOnSelection(ctx);
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return translateOnSelection(ctx);
        case "state":
          return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady"]);
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const shape = ctx.getShapeMap()[option.id];
      if (!shape || !textEditorController) return;

      renderCtx.save();
      renderCtx.transform(...textBounds.affine);
      textEditorController.render(renderCtx);
      renderCtx.restore();
    },
  };
}
