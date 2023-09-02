import { IVec2, applyAffine } from "okageo";
import { getShapeTextBounds } from "../../../../shapes";
import { TextEditorController, newTextEditorController } from "../../../textEditor";
import { handleHistoryEvent, handleStateEvent, translateOnSelection } from "../commons";
import { AppCanvasState, AppCanvasStateContext } from "../core";
import { newTextSelectingState } from "./textSelectingState";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { newPanningState } from "../../commons";

interface Option {
  id: string;
  textEditorController?: TextEditorController;
  point?: IVec2;
}

export function newTextEditingState(option: Option): AppCanvasState {
  let textEditorController: TextEditorController;
  let textBounds: ReturnType<typeof getShapeTextBounds>;

  function updateEditorPosition(ctx: AppCanvasStateContext) {
    if (!textEditorController || !applyAffine) return;

    const bounds = textEditorController.getBoundsAtIME();
    if (!bounds) return;

    const p = { x: bounds.x, y: bounds.y };
    ctx.setTextEditorPosition(applyAffine(textBounds.affine, p));
  }

  function onCursorUpdated(ctx: AppCanvasStateContext) {
    if (!textEditorController) return;

    ctx.setCurrentDocAttrInfo(textEditorController.getCurrentAttributeInfo());
    ctx.setTmpShapeMap({});
  }

  return {
    getLabel: () => "TextEditing",
    onStart: async (ctx) => {
      ctx.showFloatMenu();
      ctx.startTextEditing();

      const shape = ctx.getShapeMap()[option.id];
      textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);

      if (option.textEditorController) {
        textEditorController = option.textEditorController;
      } else {
        textEditorController = newTextEditorController();
        textEditorController.setRenderingContext(ctx.getRenderCtx()!);
        textEditorController.setDoc(ctx.getDocumentMap()[option.id], textBounds.range);

        if (option.point) {
          const location = textEditorController.getLocationAt(applyAffine(textBounds.affineReverse, option.point));
          textEditorController.setCursor(textEditorController.getLocationIndex(location));
        } else {
          textEditorController.moveCursorToTail();
        }
      }

      updateEditorPosition(ctx);
      onCursorUpdated(ctx);

      ctx.setCaptureTimeout(1000);
    },
    onEnd: async (ctx) => {
      ctx.hideFloatMenu();
      ctx.stopTextEditing();
      ctx.setCaptureTimeout();
      ctx.setCurrentDocAttrInfo({});
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "text-input": {
          const cursor = textEditorController.getCursor();
          ctx.patchDocuments({ [option.id]: textEditorController.getDeltaByInput(event.data.value) });
          textEditorController.setCursor(cursor + event.data.value.length);

          if (event.data.composition) {
            textEditorController.startIME(event.data.value.length);
          } else {
            textEditorController.stopIME();
          }
          return;
        }
        case "pointerdown": {
          switch (event.data.options.button) {
            case 0: {
              const shape = ctx.getShapeAt(event.data.point);
              if (shape?.id !== option.id) {
                shape ? ctx.selectShape(shape.id, event.data.options.ctrl) : ctx.clearAllSelected();
                return translateOnSelection(ctx);
              }

              const location = textEditorController.getLocationAt(
                applyAffine(textBounds.affineReverse, event.data.point)
              );
              textEditorController.setCursor(textEditorController.getLocationIndex(location));
              updateEditorPosition(ctx);
              onCursorUpdated(ctx);
              return {
                type: "stack-resume",
                getState: () => newTextSelectingState({ id: option.id, textEditorController }),
              };
            }
            case 1:
              return { type: "stack-restart", getState: newPanningState };
            default:
              return;
          }
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
              onCursorUpdated(ctx);
              return;
            case "ArrowRight": {
              if (event.data.shift) {
                textEditorController.shiftSelectionBy(1);
              } else {
                textEditorController.shiftCursorBy(1);
              }
              onCursorUpdated(ctx);
              return;
            }
            case "ArrowUp":
              textEditorController.moveCursorUp();
              onCursorUpdated(ctx);
              return;
            case "ArrowDown":
              textEditorController.moveCursorDown();
              onCursorUpdated(ctx);
              return;
            case "Backspace": {
              const cursor = textEditorController.getCursor();
              const selection = textEditorController.getSelection();
              if (selection > 0) {
                ctx.patchDocuments({ [option.id]: [{ retain: cursor }, { delete: Math.max(1, selection) }] });
                textEditorController.setCursor(cursor);
              } else {
                ctx.patchDocuments({ [option.id]: [{ retain: cursor - 1 }, { delete: 1 }] });
                textEditorController.setCursor(cursor - 1);
              }
              return;
            }
            case "Delete": {
              const cursor = textEditorController.getCursor();
              const selection = textEditorController.getSelection();
              if (selection > 0) {
                ctx.patchDocuments({ [option.id]: [{ retain: cursor }, { delete: Math.max(1, selection) }] });
                textEditorController.setCursor(cursor);
              } else {
                ctx.patchDocuments({ [option.id]: [{ retain: cursor }, { delete: 1 }] });
                textEditorController.setCursor(cursor);
              }
              return;
            }
            case "Escape": {
              return translateOnSelection(ctx);
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
        case "text-style": {
          const attrs = event.data.value;
          const currentInfo = textEditorController.getCurrentAttributeInfo();
          if (event.data.doc) {
            const ops = textEditorController.getDeltaByApplyDocStyle(attrs);
            ctx.patchDocuments({ [option.id]: ops });
            ctx.setCurrentDocAttrInfo({ ...currentInfo, doc: { ...currentInfo.doc, ...attrs } });
          } else if (event.data.block) {
            const ops = textEditorController.getDeltaByApplyBlockStyle(attrs);
            ctx.patchDocuments({ [option.id]: ops });
            ctx.setCurrentDocAttrInfo({ ...currentInfo, block: { ...currentInfo.block, ...attrs } });
          } else {
            const ops = textEditorController.getDeltaByApplyInlineStyle(attrs);
            ctx.patchDocuments({ [option.id]: ops });
            ctx.setCurrentDocAttrInfo({ ...currentInfo, cursor: { ...currentInfo.cursor, ...attrs } });
          }
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

      const style = ctx.getStyleScheme();
      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * ctx.getScale() });
      renderCtx.beginPath();
      renderCtx.strokeRect(textBounds.range.x, textBounds.range.x, textBounds.range.width, textBounds.range.height);
      renderCtx.stroke();

      textEditorController.render(renderCtx);
      renderCtx.restore();
    },
  };
}
