import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { newMovingShapeState } from "../movingShapeState";
import {
  BoardColumnMovingHandler,
  BoardColumnMovingHitResult,
  newBoardColumnMovingHandler,
} from "../../../boardHandler";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { newShapeComposite } from "../../../shapeComposite";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { findexSortFn } from "../../../../utils/commons";
import { IVec2, add, sub } from "okageo";
import { newShapeRenderer } from "../../../shapeRenderer";
import { BoardColumnShape } from "../../../../shapes/board/boardColumn";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";

export function newBoardColumnMovingState(): AppCanvasState {
  let columnShapes: BoardColumnShape[];
  let boardColumnMovingHandler: BoardColumnMovingHandler;
  let boardMovingHitResult: BoardColumnMovingHitResult | undefined;
  let diff: IVec2;

  function initHandler(ctx: AppCanvasStateContext) {
    boardColumnMovingHandler = newBoardColumnMovingHandler({
      getShapeComposite: ctx.getShapeComposite,
      boardId: columnShapes[0].parentId!,
      columnIds: columnShapes.map((s) => s.id),
    });
  }

  return {
    getLabel: () => "BoardColumnMoving",
    onStart: (ctx) => {
      const shapeMap = ctx.getShapeComposite().shapeMap;
      const cardIds = Object.keys(ctx.getSelectedShapeIdMap());
      columnShapes = cardIds.map((id) => shapeMap[id] as BoardColumnShape).sort(findexSortFn);

      if (columnShapes.some((s) => !shapeMap[s.parentId ?? ""])) {
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
          const result = boardColumnMovingHandler.hitTest(event.data.current);
          ctx.redraw();
          boardMovingHitResult = result;
          return;
        }
        case "pointerup": {
          if (boardMovingHitResult) {
            const findexBetween = boardMovingHitResult.findexBetween;
            let findex = generateKeyBetweenAllowSame(findexBetween[0], findexBetween[1]);
            const patch = columnShapes.reduce<{ [id: string]: Partial<BoardColumnShape> }>((p, s) => {
              p[s.id] = { findex };
              findex = generateKeyBetweenAllowSame(findex, findexBetween[1]);
              return p;
            }, {});

            const shapeComposite = ctx.getShapeComposite();
            ctx.patchShapes(getPatchByLayouts(shapeComposite, { update: patch }));
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        case "shape-updated": {
          if (boardColumnMovingHandler.isBoardChanged(Array.from(event.data.keys))) {
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
      const rect = shapeComposite.getWrapperRectForShapes(columnShapes);
      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
      scaleGlobalAlpha(renderCtx, 0.3, () => {
        renderCtx.fill();
      });

      boardColumnMovingHandler.render(renderCtx, style, scale, boardMovingHitResult);

      if (diff) {
        const shapeRenderer = newShapeRenderer({
          shapeComposite: newShapeComposite({
            shapes: columnShapes.map((s) => ({ ...s, p: add(s.p, diff) })),
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
