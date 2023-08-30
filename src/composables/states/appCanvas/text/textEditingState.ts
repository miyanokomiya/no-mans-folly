import { applyAffine } from "okageo";
import { getShapeTextBounds } from "../../../../shapes";
import { TextEditorController, newTextEditorController } from "../../../textEditor";
import { handleHistoryEvent, handleStateEvent, translateOnSelection } from "../commons";
import { AppCanvasState } from "../core";
import { newTextSelectingState } from "./textSelectingState";

interface Option {
  id: string;
  textEditorController?: TextEditorController;
}

export function newTextEditingState(option: Option): AppCanvasState {
  let textEditorController: TextEditorController;
  let textBounds: ReturnType<typeof getShapeTextBounds>;

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
          return () => newTextSelectingState({ id: option.id, textEditorController });
        }
        case "keydown":
          switch (event.data.key) {
            case "ArrowLeft":
              textEditorController.setCursor(textEditorController.getCursor() - 1);
              ctx.setTmpShapeMap({});
              return;
            case "ArrowRight": {
              textEditorController.setCursor(textEditorController.getCursor() + 1);
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
              ctx.patchDocument(option.id, [{ retain: cursor - 1 }, { delete: 1 }]);
              textEditorController.setCursor(cursor - 1);
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
