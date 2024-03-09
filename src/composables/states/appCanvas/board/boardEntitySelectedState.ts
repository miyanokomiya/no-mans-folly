import type { AppCanvasStateContext } from "../core";
import { newPanningState } from "../../commons";
import {
  getCommonCommandExams,
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
  startTextEditingIfPossible,
} from "../commons";
import { newSelectionHubState } from "../selectionHubState";
import { CONTEXT_MENU_SHAPE_SELECTED_ITEMS } from "../contextMenuItems";
import { findBetterShapeAt } from "../../../shapeComposite";
import { BoardCardShape, isBoardCardShape } from "../../../../shapes/board/boardCard";
import { BoardHandler, BoardHitResult, isSameBoardHitResult, newBoardHandler } from "../../../boardHandler";
import { canHaveText, createShape } from "../../../../shapes";
import { getDocAttributes, getInitialOutput } from "../../../../utils/textEditor";
import { Shape } from "../../../../models";
import { newSingleSelectedState } from "../singleSelectedState";
import { isBoardRootShape } from "../../../../shapes/board/boardRoot";
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { defineIntransientState } from "../intransientState";

/**
 * General selected state for any board entity
 * - BoardRootShape, BoardColumnShape, BoardLaneShape, BoardCardShape
 */
export const newBoardEntitySelectedState = defineIntransientState(() => {
  let boardId: string;
  let targetShape: Shape;
  let boardHandler: BoardHandler;
  let boardHitResult: BoardHitResult | undefined;
  let boundingBox: BoundingBox;

  function initHandler(ctx: AppCanvasStateContext) {
    boardHandler = newBoardHandler({
      getShapeComposite: ctx.getShapeComposite,
      boardId,
    });
  }

  return {
    getLabel: () => "BoardEntitySelected",
    onStart: (ctx) => {
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
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

      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(targetShape),
        noRotation: true,
      });

      ctx.showFloatMenu();
      ctx.setCommandExams(getCommonCommandExams(ctx));
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
                  const patch = getPatchByLayouts(shapeComposite, {
                    add: [newShape],
                  });
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

              const hitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
              if (hitResult) {
                switch (hitResult.type) {
                  case "corner":
                  case "segment":
                    return () => newResizingState({ boundingBox, hitResult });
                }
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

          const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (boundingBox.saveHitResult(hitBounding)) {
            ctx.redraw();
          }
          break;
        }
        case "shape-updated": {
          const result = handleIntransientEvent(ctx, event);
          if (!result && boardHandler.isBoardChanged(Array.from(event.data.keys))) {
            initHandler(ctx);
          }
          return result;
        }
        case "contextmenu":
          ctx.setContextMenuList({
            items: CONTEXT_MENU_SHAPE_SELECTED_ITEMS,
            point: event.data.point,
          });
          return;
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();
      boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
      boardHandler.render(renderCtx, style, scale, boardHitResult);
    },
  };
});
