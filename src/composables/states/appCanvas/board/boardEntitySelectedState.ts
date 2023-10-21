import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newPanningState } from "../../commons";
import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleCommonShortcut,
  handleCommonTextStyle,
  handleFileDrop,
  handleHistoryEvent,
  handleStateEvent,
  newShapeClipboard,
  startTextEditingIfPossible,
} from "../commons";
import { newSelectionHubState } from "../selectionHubState";
import { CONTEXT_MENU_ITEM_SRC, handleContextItemEvent } from "../contextMenuItems";
import { findBetterShapeAt, getNextShapeComposite } from "../../../shapeComposite";
import { BoardCardShape, isBoardCardShape } from "../../../../shapes/board/boardCard";
import { applyPath } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import {
  BoardHandler,
  BoardHitResult,
  getNextBoardLayout,
  isSameBoardHitResult,
  newBoardHandler,
} from "../../../boardHandler";
import { canHaveText, createShape } from "../../../../shapes";
import { getDocAttributes, getInitialOutput } from "../../../../utils/textEditor";
import { Shape } from "../../../../models";
import { newSingleSelectedState } from "../singleSelectedState";
import { isBoardRootShape } from "../../../../shapes/board/boardRoot";

/**
 * General selected state for any board entity
 * - BoardRootShape, BoardColumnShape, BoardLaneShape, BoardCardShape
 */
export function newBoardEntitySelectedState(): AppCanvasState {
  let boardId: string;
  let targetShape: Shape;
  let boardHandler: BoardHandler;
  let boardHitResult: BoardHitResult | undefined;

  function initHandler(ctx: AppCanvasStateContext) {
    boardHandler = newBoardHandler({
      getShapeComposite: ctx.getShapeComposite,
      boardId,
    });
  }

  return {
    getLabel: () => "BoardEntitySelected",
    onStart: (ctx) => {
      const shapeMap = ctx.getShapeComposite().shapeMap;
      targetShape = shapeMap[ctx.getLastSelectedShapeId() ?? ""];

      if (isBoardRootShape(targetShape)) {
        boardId = targetShape.id;
      } else {
        if (!shapeMap[targetShape.parentId ?? ""]) {
          return newSingleSelectedState;
        }

        boardId = targetShape.parentId!;
      }

      if (isBoardCardShape(targetShape) && !shapeMap[targetShape.columnId]) {
        return newSingleSelectedState;
      }

      ctx.showFloatMenu();
      ctx.setCommandExams([]);
      initHandler(ctx);
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCursor();
      ctx.setCommandExams();
      ctx.setContextMenuList();
    },
    handleEvent: (ctx, event) => {
      if (!targetShape) return newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              boardHitResult = boardHandler.hitTest(event.data.point, ctx.getScale());
              if (boardHitResult) {
                const shapeComposite = ctx.getShapeComposite();

                let newShape: Shape | undefined;
                switch (boardHitResult.type) {
                  case "add_card": {
                    newShape = createShape<BoardCardShape>(shapeComposite.getShapeStruct, "board_card", {
                      id: ctx.generateUuid(),
                      findex: boardHandler.generateNewCardFindex(),
                      parentId: boardId,
                      columnId: boardHitResult.columnId,
                      laneId: boardHitResult.laneId,
                    });
                    break;
                  }
                  case "add_column": {
                    newShape = createShape(shapeComposite.getShapeStruct, "board_column", {
                      id: ctx.generateUuid(),
                      findex: boardHandler.generateNewColumnFindex(),
                      parentId: boardId,
                    });
                    break;
                  }
                  case "add_lane": {
                    newShape = createShape(shapeComposite.getShapeStruct, "board_lane", {
                      id: ctx.generateUuid(),
                      findex: boardHandler.generateNewLaneFindex(),
                      parentId: boardId,
                    });
                    break;
                  }
                }

                if (newShape) {
                  const nextComposite = getNextShapeComposite(shapeComposite, {
                    add: [newShape],
                  });
                  const patch = getNextBoardLayout(nextComposite, newShape.parentId!);
                  newShape = { ...newShape, ...patch[newShape.id] };
                  delete patch[newShape.id];

                  ctx.addShapes(
                    [newShape],
                    canHaveText(ctx.getShapeStruct, newShape)
                      ? {
                          [newShape.id]: getInitialOutput(getDocAttributes(ctx.getDocumentMap()[newShape.id])),
                        }
                      : undefined,
                    patch,
                  );
                  ctx.selectShape(newShape.id);
                }
                return;
              }

              return handleCommonPointerDownLeftOnSingleSelection(
                ctx,
                event,
                targetShape.id,
                ctx.getShapeComposite().getSelectionScope(targetShape),
              );
            }
            case 1:
              return { type: "stack-resume", getState: newPanningState };
            case 2: {
              return handleCommonPointerDownRightOnSingleSelection(
                ctx,
                event,
                targetShape.id,
                ctx.getShapeComposite().getSelectionScope(targetShape),
              );
            }
            default:
              return;
          }
        case "pointerdoubledown": {
          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(
            shapeComposite,
            event.data.point,
            shapeComposite.getSelectionScope(targetShape),
          );
          if (shapeAtPointer && shapeAtPointer.id === targetShape.id) {
            return startTextEditingIfPossible(ctx, targetShape.id, event.data.point);
          }
          return;
        }
        case "pointerhover": {
          const result = boardHandler.hitTest(event.data.current, ctx.getScale());
          if (!isSameBoardHitResult(boardHitResult, result)) {
            ctx.redraw();
          }
          boardHitResult = result;
          if (boardHitResult) {
            ctx.setCursor();
            return;
          }

          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(
            shapeComposite,
            event.data.current,
            shapeComposite.getSelectionScope(targetShape),
          );
          ctx.setCursor(shapeAtPointer ? "pointer" : undefined);
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes([targetShape.id]);
              return;
            default:
              return handleCommonShortcut(ctx, event);
          }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        case "selection": {
          return newSelectionHubState;
        }
        case "shape-updated": {
          const shapeComposite = ctx.getShapeComposite();
          const shape = shapeComposite.mergedShapeMap[targetShape.id];
          if (!shape) return newSelectionHubState;

          if (boardHandler.isBoardChanged(Array.from(event.data.keys))) {
            initHandler(ctx);
          }
          return;
        }
        case "text-style": {
          return handleCommonTextStyle(ctx, event);
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newSelectionHubState;
        case "state":
          return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady", "TextReady"]);
        case "contextmenu":
          ctx.setContextMenuList({
            items: [CONTEXT_MENU_ITEM_SRC.EXPORT_AS_PNG, CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG],
            point: event.data.point,
          });
          return;
        case "contextmenu-item": {
          return handleContextItemEvent(ctx, event);
        }
        case "copy": {
          const clipboard = newShapeClipboard(ctx);
          clipboard.onCopy(event.nativeEvent);
          return;
        }
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
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();
      const shapeComposite = ctx.getShapeComposite();
      const path = shapeComposite.getLocalRectPolygon(targetShape);
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: style.selectionLineWidth * scale });
      renderCtx.beginPath();
      applyPath(renderCtx, path, true);
      renderCtx.stroke();

      boardHandler.render(renderCtx, style, scale, boardHitResult);
    },
  };
}