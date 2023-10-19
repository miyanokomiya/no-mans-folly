import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { BoardCardShape } from "../../../../shapes/board/boardCard";
import { newMovingShapeState } from "../movingShapeState";
import {
  BoardCardMovingHandler,
  BoardCardMovingHitResult,
  isSameBoardCardMovingHitResult,
  newBoardCardMovingHandler,
} from "../../../boardHandler";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyFillStyle } from "../../../../utils/fillStyle";

export function newBoardCardMovingState(): AppCanvasState {
  let cardShapes: BoardCardShape[];
  let boardCardMovingHandler: BoardCardMovingHandler;
  let boardMovingHitResult: BoardCardMovingHitResult | undefined;

  function initHandler(ctx: AppCanvasStateContext) {
    boardCardMovingHandler = newBoardCardMovingHandler({
      getShapeComposite: ctx.getShapeComposite,
      boardId: cardShapes[0].parentId!,
      cardIds: cardShapes.map((s) => s.id),
    });
  }

  return {
    getLabel: () => "BoardCardMoving",
    onStart: (ctx) => {
      const shapeMap = ctx.getShapeComposite().shapeMap;
      const cardIds = Object.keys(ctx.getSelectedShapeIdMap());
      cardShapes = cardIds.map((id) => shapeMap[id] as BoardCardShape);

      if (cardShapes.some((s) => !shapeMap[s.parentId ?? ""] || !shapeMap[s.columnId])) {
        return newMovingShapeState;
      }

      ctx.startDragging();
      initHandler(ctx);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const result = boardCardMovingHandler.hitTest(event.data.current);
          if (!isSameBoardCardMovingHitResult(result, boardMovingHitResult)) {
            ctx.redraw();
          }
          boardMovingHitResult = result;
          return;
        }
        case "pointerup": {
          console.log(boardMovingHitResult);
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        case "shape-updated": {
          if (boardCardMovingHandler.isBoardChanged(Array.from(event.data.keys))) {
            initHandler(ctx);
          }
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
      const rect = shapeComposite.getWrapperRectForShapes(cardShapes);
      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
      scaleGlobalAlpha(renderCtx, 0.3, () => {
        renderCtx.fill();
      });

      boardCardMovingHandler.render(renderCtx, style, scale, boardMovingHitResult);
    },
  };
}
