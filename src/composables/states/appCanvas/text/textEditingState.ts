import { IVec2, applyAffine } from "okageo";
import { getShapeTextBounds } from "../../../../shapes";
import { TextEditorController, newTextEditorController } from "../../../textEditor";
import { handleHistoryEvent, handleStateEvent, newDocClipboard, translateOnSelection } from "../commons";
import { AppCanvasState, AppCanvasStateContext } from "../core";
import { newTextSelectingState } from "./textSelectingState";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { newPanningState } from "../../commons";
import { isMac } from "../../../../utils/devices";
import { KeyDownEvent, TransitionValue } from "../../core";
import { CursorPositionInfo } from "../../../../stores/documents";
import { TextShape, isTextShape, patchSize } from "../../../../shapes/text";
import { DocAttrInfo, DocDelta } from "../../../../models/document";
import { calcOriginalDocSize } from "../../../../utils/textEditor";

interface Option {
  id: string;
  textEditorController?: TextEditorController;
  point?: IVec2;
}

export function newTextEditingState(option: Option): AppCanvasState {
  let textEditorController: TextEditorController;
  let textBounds: ReturnType<typeof getShapeTextBounds>;
  let cursorInfo: CursorPositionInfo | undefined;

  function updateEditorPosition(ctx: AppCanvasStateContext) {
    if (!textEditorController || !applyAffine) return;

    const bounds = textEditorController.getBoundsAtIME();
    if (!bounds) return;

    const p = { x: bounds.x, y: bounds.y };
    ctx.setTextEditorPosition(applyAffine(textBounds.affine, p));
  }

  function onCursorUpdated(ctx: AppCanvasStateContext) {
    if (!textEditorController) return;

    cursorInfo = ctx.createCursorPosition(option.id, textEditorController.getCursor());
    ctx.setCurrentDocAttrInfo(textEditorController.getCurrentAttributeInfo());
    ctx.setTmpShapeMap({});
  }

  function patchDocument(ctx: AppCanvasStateContext, delta: DocDelta) {
    _patchDocument(ctx, delta, option.id);
  }

  return {
    getLabel: () => "TextEditing",
    onStart: (ctx) => {
      ctx.setCursor();
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
      ctx.setCommandExams([
        { command: "Ctrl + p, n, b, f", title: "Move cursor" },
        { command: "Ctrl + h", title: "Backspace" },
        { command: "Ctrl + d", title: "Delete" },
      ]);
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.stopTextEditing();
      ctx.setCaptureTimeout();
      ctx.setCurrentDocAttrInfo({});
      ctx.setCommandExams();

      // Delete text shape when it has no content.
      const shape = ctx.getShapeMap()[option.id];
      if (shape && isTextShape(shape)) {
        if (textEditorController.getDocLength() <= 1) {
          // Create extra history in case this deletion is undone.
          // => Because, restoring the content right before deletion isn't always feasible.
          ctx.patchDocuments(
            { [option.id]: [{ insert: "---" }] },
            { [option.id]: { width: 40 } as Partial<TextShape> }
          );
          ctx.deleteShapes([option.id]);
          ctx.createLastIndex();
        }
      }
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "text-input": {
          const cursor = textEditorController.getCursor();
          patchDocument(ctx, textEditorController.getDeltaByInput(event.data.value));
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
        case "pointerdoubledown": {
          textEditorController.selectWordAtCursor();
          onCursorUpdated(ctx);
          return;
        }
        case "keydown":
          updateEditorPosition(ctx);
          return handleKeydown(ctx, textEditorController, onCursorUpdated, patchDocument, event);
        case "shape-updated": {
          const shape = ctx.getShapeMap()[option.id];
          if (!shape) return translateOnSelection(ctx);

          if (event.data.keys.has(option.id)) {
            textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);
            textEditorController.setDoc(ctx.getDocumentMap()[option.id], textBounds.range);
            textEditorController.setCursor(ctx.retrieveCursorPosition(cursorInfo), textEditorController.getSelection());
          }
          return;
        }
        case "text-style": {
          const attrs = event.data.value;
          const currentInfo = textEditorController.getCurrentAttributeInfo();
          let ops: DocDelta;
          let nextInfo: DocAttrInfo;

          if (event.data.doc) {
            ops = textEditorController.getDeltaByApplyDocStyle(attrs);
            nextInfo = { ...currentInfo, doc: { ...currentInfo.doc, ...attrs } };
          } else if (event.data.block) {
            ops = textEditorController.getDeltaByApplyBlockStyle(attrs);
            nextInfo = { ...currentInfo, block: { ...currentInfo.block, ...attrs } };
          } else {
            ops = textEditorController.getDeltaByApplyInlineStyle(attrs);
            nextInfo = { ...currentInfo, cursor: { ...currentInfo.cursor, ...attrs } };
          }

          patchDocument(ctx, ops);
          ctx.setCurrentDocAttrInfo(nextInfo);
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
          return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady", "TextReady"]);
        case "copy": {
          const clipboard = newDocClipboard(textEditorController.getSelectedDocOutput());
          clipboard.onCopy(event.nativeEvent);
          return;
        }
        case "paste": {
          const clipboard = newDocClipboard([], (doc) => {
            const count = doc.flatMap((p) => p.insert).join("").length;
            patchDocument(ctx, textEditorController.getDeltaByPaste(doc, event.data.shift));
            textEditorController.setCursor(textEditorController.getCursor() + count);
          });
          clipboard.onPaste(event.nativeEvent);
          return;
        }
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

function handleKeydown(
  ctx: AppCanvasStateContext,
  textEditorController: TextEditorController,
  onCursorUpdated: (ctx: AppCanvasStateContext) => void,
  patchDocument: (ctx: AppCanvasStateContext, delta: DocDelta) => void,
  event: KeyDownEvent
): TransitionValue<AppCanvasStateContext> {
  switch (event.data.key) {
    case "a":
      if (event.data.ctrl) {
        event.data.prevent?.();
        if (event.data.command) {
          textEditorController.selectAll();
        } else if (isMac()) {
          textEditorController.moveCursorLineHead();
        } else {
          textEditorController.selectAll();
        }
        onCursorUpdated(ctx);
      }
      return;
    case "Home":
      event.data.prevent?.();
      textEditorController.moveCursorLineHead();
      onCursorUpdated(ctx);
      return;
    case "End":
      event.data.prevent?.();
      textEditorController.moveCursorLineTail();
      onCursorUpdated(ctx);
      return;
    case "e":
      if (event.data.ctrl) {
        event.data.prevent?.();
        textEditorController.moveCursorLineTail();
        onCursorUpdated(ctx);
      }
      return;
    case "f":
      if (event.data.ctrl) {
        event.data.prevent?.();
        textEditorController.shiftCursorBy(1);
        onCursorUpdated(ctx);
      }
      return;
    case "b":
      if (event.data.ctrl) {
        event.data.prevent?.();
        textEditorController.shiftCursorBy(-1);
        onCursorUpdated(ctx);
      }
      return;
    case "n":
      if (event.data.ctrl) {
        event.data.prevent?.();
        textEditorController.moveCursorDown();
        onCursorUpdated(ctx);
      }
      return;
    case "p":
      if (event.data.ctrl) {
        event.data.prevent?.();
        textEditorController.moveCursorUp();
        onCursorUpdated(ctx);
      }
      return;
    case "h":
      if (event.data.ctrl) {
        event.data.prevent?.();
        const info = textEditorController.getDeltaAndCursorByBackspace();
        patchDocument(ctx, info.delta);
        textEditorController.setCursor(info.cursor);
      }
      return;
    case "d":
      if (event.data.ctrl) {
        event.data.prevent?.();
        const info = textEditorController.getDeltaAndCursorByDelete();
        patchDocument(ctx, info.delta);
        textEditorController.setCursor(info.cursor);
      }
      return;
    case "z":
      if (event.data.ctrl) {
        event.data.prevent?.();
        ctx.undo();
      }
      return;
    case "Z":
      if (event.data.ctrl) {
        event.data.prevent?.();
        ctx.redo();
      }
      return;
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
      const info = textEditorController.getDeltaAndCursorByBackspace();
      patchDocument(ctx, info.delta);
      textEditorController.setCursor(info.cursor);
      return;
    }
    case "Delete": {
      const info = textEditorController.getDeltaAndCursorByDelete();
      patchDocument(ctx, info.delta);
      textEditorController.setCursor(info.cursor);
      return;
    }
    case "Escape": {
      return translateOnSelection(ctx);
    }
  }
}

function _patchDocument(ctx: AppCanvasStateContext, delta: DocDelta, id: string) {
  const shape = ctx.getShapeMap()[id];
  const renderCtx = ctx.getRenderCtx();
  let shapePatch: Partial<TextShape> | undefined = undefined;
  if (renderCtx && isTextShape(shape)) {
    const patched = ctx.patchDocDryRun(id, delta);
    const size = calcOriginalDocSize(patched, renderCtx, shape.maxWidth);
    shapePatch = patchSize(shape, size);
  }

  if (shapePatch) {
    ctx.patchDocuments({ [id]: delta }, { [id]: shapePatch });
  } else {
    ctx.patchDocuments({ [id]: delta });
  }
}
