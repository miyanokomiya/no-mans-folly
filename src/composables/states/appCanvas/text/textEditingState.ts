import { IVec2, applyAffine } from "okageo";
import { getShapeTextBounds } from "../../../../shapes";
import { TextEditorController, newTextEditorController } from "../../../textEditor";
import {
  getCommonAcceptableEvents,
  handleFileDrop,
  handleHistoryEvent,
  handleStateEvent,
  isShapeInteratctiveWithinViewport,
  newDocClipboard,
} from "../commons";
import { AppCanvasState, AppCanvasStateContext } from "../core";
import { newTextSelectingState } from "./textSelectingState";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { isMac } from "../../../../utils/devices";
import { KeyDownEvent, TransitionValue } from "../../core";
import { CursorPositionInfo } from "../../../../stores/documents";
import { TextShape, isTextShape } from "../../../../shapes/text";
import { DocAttrInfo, DocDelta } from "../../../../models/document";
import { splitToSegments } from "../../../../utils/textEditor";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { findBetterShapeAt } from "../../../shapeComposite";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";
import { handleCommonWheel } from "../../commons";
import { getPatchShapeByDocumentUpdate } from "../utils/text";

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
    ctx.redraw();
  }

  function patchDocument(ctx: AppCanvasStateContext, delta: DocDelta, draft?: boolean) {
    _patchDocument(ctx, delta, option.id, draft);
  }

  function getMergedDoc(ctx: AppCanvasStateContext) {
    const docOutput = ctx.getDocumentMap()[option.id];
    const tmpDoc = ctx.getTmpDocMap()[option.id];
    return tmpDoc ? ctx.patchDocDryRun(option.id, tmpDoc) : docOutput;
  }

  const render: AppCanvasState["render"] = (ctx, renderCtx) => {
    const shape = ctx.getShapeComposite().mergedShapeMap[option.id];
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
  };

  return {
    getLabel: () => "TextEditing",
    onStart: (ctx) => {
      ctx.setCursor();
      ctx.showFloatMenu();
      ctx.setLinkInfo();
      ctx.startTextEditing();
      ctx.setTmpShapeMap({});
      ctx.setTmpDocMap({});

      const shape = ctx.getShapeComposite().mergedShapeMap[option.id];
      textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);

      if (option.textEditorController) {
        textEditorController = option.textEditorController;
      } else {
        textEditorController = newTextEditorController();
        textEditorController.setRenderingContext(ctx.getRenderCtx()!);

        textEditorController.setDoc(getMergedDoc(ctx), textBounds.range);

        if (option.point) {
          const location = textEditorController.getLocationAt(
            applyAffine(textBounds.affineReverse, option.point),
            true,
          );
          textEditorController.setCursor(textEditorController.getLocationIndex(location));
          textEditorController.selectWordAtCursor();
        } else {
          textEditorController.moveCursorToTail();
        }
      }

      updateEditorPosition(ctx);
      onCursorUpdated(ctx);

      ctx.setCaptureTimeout(1000);
      ctx.setCommandExams([
        COMMAND_EXAM_SRC.TEXT_MOVE_CURSOR,
        COMMAND_EXAM_SRC.TEXT_BACKSPACE,
        COMMAND_EXAM_SRC.TEXT_DELETE,
        COMMAND_EXAM_SRC.TEXT_EMOJI_PICKER,
      ]);
    },
    onResume: (ctx) => {
      ctx.startTextEditing();
      ctx.showFloatMenu();
      onCursorUpdated(ctx);
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.stopTextEditing();
      ctx.setCaptureTimeout();
      ctx.setCurrentDocAttrInfo({});
      ctx.setCommandExams();
      ctx.setTmpShapeMap({});
      ctx.setTmpDocMap({});

      // Delete text shape when it has no content.
      const shapeComposite = ctx.getShapeComposite();
      const shape = shapeComposite.shapeMap[option.id];
      if (shape && isTextShape(shape)) {
        if (textEditorController.getDocLength() <= 1) {
          // Create extra history in case this deletion is undone.
          // => Because, restoring the content right before deletion isn't always feasible.
          ctx.patchDocuments(
            { [option.id]: [{ insert: "---" }] },
            { [option.id]: { width: 40 } as Partial<TextShape> },
          );
          ctx.deleteShapes([option.id]);
        }
      }
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "text-input": {
          const [delta, nextCursor] = textEditorController.getDeltaByInputWithListDetection(event.data.value);
          patchDocument(ctx, delta);
          textEditorController.setCursor(nextCursor);

          if (event.data.composition) {
            const inputLength = splitToSegments(event.data.value).length;
            textEditorController.startIME(inputLength);
          } else {
            textEditorController.stopIME();
          }
          return;
        }
        case "pointerdown": {
          switch (event.data.options.button) {
            case 0: {
              const adjustedP = applyAffine(textBounds.affineReverse, event.data.point);

              // Check if the point is in the doc.
              // If not, try to find a shape at the point.
              if (!textEditorController.isInDoc(adjustedP)) {
                const shapeComposite = ctx.getShapeComposite();
                shapeComposite.getSelectionScope(shapeComposite.shapeMap[option.id]);
                const shapeAtPointer = findBetterShapeAt(
                  shapeComposite,
                  event.data.point,
                  shapeComposite.getSelectionScope(shapeComposite.shapeMap[option.id]),
                  undefined,
                  ctx.getScale(),
                );

                // If the shape is the doc owner, keep editing it.
                // If not, select the shape.
                if (shapeAtPointer?.id !== option.id) {
                  if (shapeAtPointer && isShapeInteratctiveWithinViewport(ctx, shapeAtPointer)) {
                    ctx.selectShape(shapeAtPointer.id, event.data.options.ctrl);
                  } else {
                    return {
                      type: "stack-resume",
                      getState: () => newPointerDownEmptyState({ ...event.data.options, renderWhilePanning: render }),
                    };
                  }
                  return ctx.states.newSelectionHubState;
                }
              }

              const location = textEditorController.getLocationAt(adjustedP);
              textEditorController.setCursor(textEditorController.getLocationIndex(location));
              updateEditorPosition(ctx);
              onCursorUpdated(ctx);
              return {
                type: "stack-resume",
                getState: () => newTextSelectingState({ id: option.id, textEditorController }),
              };
            }
            case 1:
              ctx.hideFloatMenu();
              ctx.stopTextEditing();
              return {
                type: "stack-resume",
                getState: () => newPointerDownEmptyState({ ...event.data.options, renderWhilePanning: render }),
              };
            default:
              return;
          }
        }
        case "pointerdoubleclick": {
          const location = textEditorController.getLocationAt(
            applyAffine(textBounds.affineReverse, event.data.point),
            true,
          );
          textEditorController.setCursor(textEditorController.getLocationIndex(location));
          textEditorController.selectWordAtCursor();
          onCursorUpdated(ctx);
          return;
        }
        case "keydown":
          updateEditorPosition(ctx);
          return handleKeydown(ctx, textEditorController, onCursorUpdated, patchDocument, event);
        case "shape-updated": {
          const shape = ctx.getShapeComposite().mergedShapeMap[option.id];
          if (!shape) return ctx.states.newSelectionHubState;

          if (event.data.keys.has(option.id)) {
            textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);
            textEditorController.setDoc(getMergedDoc(ctx), textBounds.range);
            textEditorController.setCursor(ctx.retrieveCursorPosition(cursorInfo), textEditorController.getSelection());
          }
          return;
        }
        case "tmp-shape-updated": {
          const shape = ctx.getShapeComposite().mergedShapeMap[option.id];
          if (!shape) return ctx.states.newSelectionHubState;

          const shapeUpdated = ctx.getTmpShapeMap()[option.id];
          const docUpdated = ctx.getTmpDocMap()[option.id];
          if (shapeUpdated || docUpdated) {
            textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);
            textEditorController.setDoc(getMergedDoc(ctx), textBounds.range);
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

          patchDocument(ctx, ops, event.data.draft);
          ctx.setCurrentDocAttrInfo(nextInfo);
          return;
        }
        case "close-emoji-picker":
          ctx.setShowEmojiPicker(false);
          return;
        case "wheel":
          handleCommonWheel(ctx, event);
          return;
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return ctx.states.newSelectionHubState;
        case "state":
          return handleStateEvent(ctx, event, getCommonAcceptableEvents(["Break", "ShapeInspection"]));
        case "copy": {
          const clipboard = newDocClipboard(textEditorController.getSelectedDocOutput());
          clipboard.onCopy(event.nativeEvent);
          return;
        }
        case "paste": {
          const clipboard = newDocClipboard([], (doc, plain) => {
            const pastedInfo = textEditorController.getDeltaByPaste(doc, plain || event.data.shift);
            patchDocument(ctx, pastedInfo.delta);
            textEditorController.setCursor(pastedInfo.cursor, pastedInfo.selection);
          });
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
    render,
  };
}

function handleKeydown(
  ctx: AppCanvasStateContext,
  textEditorController: TextEditorController,
  onCursorUpdated: (ctx: AppCanvasStateContext) => void,
  patchDocument: (ctx: AppCanvasStateContext, delta: DocDelta) => void,
  event: KeyDownEvent,
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
    case ";":
    case ":":
      if (event.data.ctrl) {
        event.data.prevent?.();
        ctx.setShowEmojiPicker(true);
      }
      return;
    case "Tab": {
      // Handle list indentation
      event.data.prevent?.();
      const delta = textEditorController.getDeltaByChangeIndent(!event.data.shift);
      if (delta.length > 0) {
        patchDocument(ctx, delta);
        onCursorUpdated(ctx);
      }
      return;
    }
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
      if (event.data.shift) {
        textEditorController.shiftSelectionUp();
      } else {
        textEditorController.moveCursorUp();
      }
      onCursorUpdated(ctx);
      return;
    case "ArrowDown":
      if (event.data.shift) {
        textEditorController.shiftSelectionDown();
      } else {
        textEditorController.moveCursorDown();
      }
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
      return ctx.states.newSelectionHubState;
    }
  }
}

function _patchDocument(ctx: AppCanvasStateContext, delta: DocDelta, id: string, draft?: boolean) {
  const shapePatch = getPatchShapeByDocumentUpdate(ctx, delta, id);
  const shapeComposite = ctx.getShapeComposite();
  const shape = shapeComposite.shapeMap[id];

  let patchMap = shapePatch ? { [shape.id]: shapePatch } : undefined;
  if (patchMap) {
    patchMap = getPatchByLayouts(shapeComposite, { update: patchMap });
  }

  if (draft) {
    ctx.setTmpDocMap({ [id]: delta });
    if (patchMap) ctx.setTmpShapeMap(patchMap);
  } else {
    ctx.setTmpDocMap({});
    if (patchMap) ctx.setTmpShapeMap({});
    ctx.patchDocuments({ [id]: delta }, patchMap);
  }
}
