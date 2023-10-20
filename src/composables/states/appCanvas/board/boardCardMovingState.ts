import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { BoardCardShape } from "../../../../shapes/board/boardCard";
import { newMovingShapeState } from "../movingShapeState";
import {
  BoardCardMovingHandler,
  BoardCardMovingHitResult,
  getNextBoardLayout,
  newBoardCardMovingHandler,
} from "../../../boardHandler";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { getNextShapeComposite, newShapeComposite } from "../../../shapeComposite";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { findexSortFn, mergeMap } from "../../../../utils/commons";
import { IVec2, add, sub } from "okageo";
import { newShapeRenderer } from "../../../shapeRenderer";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";

export function newBoardCardMovingState(): AppCanvasState {
  let cardShapes: BoardCardShape[];
  let boardCardMovingHandler: BoardCardMovingHandler;
  let boardMovingHitResult: BoardCardMovingHitResult | undefined;
  let diff: IVec2;

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
      cardShapes = cardIds.map((id) => shapeMap[id] as BoardCardShape).sort(findexSortFn);

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
          diff = sub(event.data.current, event.data.start);
          const result = boardCardMovingHandler.hitTest(event.data.current);
          ctx.redraw();
          boardMovingHitResult = result;
          return;
        }
        case "pointerup": {
          if (boardMovingHitResult) {
            const findexBetween = boardMovingHitResult.findexBetween;
            const columnId = boardMovingHitResult.columnId;
            const laneId = boardMovingHitResult.laneId;
            let findex = generateKeyBetweenAllowSame(findexBetween[0], findexBetween[1]);
            const patch = cardShapes.reduce<{ [id: string]: Partial<BoardCardShape> }>((p, s) => {
              p[s.id] = { findex, columnId, laneId };
              findex = generateKeyBetweenAllowSame(findex, findexBetween[1]);
              return p;
            }, {});

            const shapeComposite = ctx.getShapeComposite();
            const nextComposite = getNextShapeComposite(shapeComposite, { update: patch });
            const layoutPatch = getNextBoardLayout(nextComposite, cardShapes[0].parentId!);
            const adjustedPatch = getPatchAfterLayouts(shapeComposite, { update: mergeMap(layoutPatch, patch) });
            ctx.patchShapes(adjustedPatch);
          }
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

      if (diff) {
        const shapeRenderer = newShapeRenderer({
          shapeComposite: newShapeComposite({
            shapes: cardShapes.map((s) => ({ ...s, p: add(s.p, diff) })),
            getStruct: shapeComposite.getShapeStruct,
          }),
          getDocumentMap: ctx.getDocumentMap,
        });
        scaleGlobalAlpha(renderCtx, 0.5, () => {
          shapeRenderer.render(renderCtx);
        });
      }
    },
  };
}
