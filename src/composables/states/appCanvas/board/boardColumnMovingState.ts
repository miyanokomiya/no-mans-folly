import type { AppCanvasState, AppCanvasStateContext } from "../core";
import {
  BoardColumnMovingHandler,
  BoardColumnMovingHitResult,
  newBoardColumnMovingHandler,
} from "../../../boardHandler";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
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
        return ctx.states.newMovingShapeState;
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
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
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
      boardColumnMovingHandler.render(renderCtx, style, scale, boardMovingHitResult);

      if (diff) {
        const shapeComposite = ctx.getShapeComposite();
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
