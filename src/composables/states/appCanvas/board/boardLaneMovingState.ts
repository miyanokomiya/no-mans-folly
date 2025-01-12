import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { BoardLaneMovingHandler, BoardLaneMovingHitResult, newBoardLaneMovingHandler } from "../../../boardHandler";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { newShapeComposite } from "../../../shapeComposite";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { findexSortFn } from "../../../../utils/commons";
import { IVec2, add, sub } from "okageo";
import { newShapeRenderer } from "../../../shapeRenderer";
import { BoardLaneShape } from "../../../../shapes/board/boardLane";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";

export function newBoardLaneMovingState(): AppCanvasState {
  let laneShapes: BoardLaneShape[];
  let boardLaneMovingHandler: BoardLaneMovingHandler;
  let boardMovingHitResult: BoardLaneMovingHitResult | undefined;
  let diff: IVec2;

  function initHandler(ctx: AppCanvasStateContext) {
    boardLaneMovingHandler = newBoardLaneMovingHandler({
      getShapeComposite: ctx.getShapeComposite,
      boardId: laneShapes[0].parentId!,
      laneIds: laneShapes.map((s) => s.id),
    });
  }

  return {
    getLabel: () => "BoardLaneMoving",
    onStart: (ctx) => {
      const shapeMap = ctx.getShapeComposite().shapeMap;
      const cardIds = Object.keys(ctx.getSelectedShapeIdMap());
      laneShapes = cardIds.map((id) => shapeMap[id] as BoardLaneShape).sort(findexSortFn);

      if (laneShapes.some((s) => !shapeMap[s.parentId ?? ""])) {
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
          const result = boardLaneMovingHandler.hitTest(event.data.current);
          ctx.redraw();
          boardMovingHitResult = result;
          return;
        }
        case "pointerup": {
          if (boardMovingHitResult) {
            const findexBetween = boardMovingHitResult.findexBetween;
            let findex = generateKeyBetweenAllowSame(findexBetween[0], findexBetween[1]);
            const patch = laneShapes.reduce<{ [id: string]: Partial<BoardLaneShape> }>((p, s) => {
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
          if (boardLaneMovingHandler.isBoardChanged(Array.from(event.data.keys))) {
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
      boardLaneMovingHandler.render(renderCtx, style, scale, boardMovingHitResult);

      if (diff) {
        const shapeComposite = ctx.getShapeComposite();
        const shapeRenderer = newShapeRenderer({
          shapeComposite: newShapeComposite({
            shapes: laneShapes.map((s) => ({ ...s, p: add(s.p, diff) })),
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
