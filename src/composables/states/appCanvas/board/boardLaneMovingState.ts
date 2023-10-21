import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { newMovingShapeState } from "../movingShapeState";
import {
  BoardLaneMovingHandler,
  BoardLaneMovingHitResult,
  getNextBoardLayout,
  newBoardLaneMovingHandler,
} from "../../../boardHandler";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { getNextShapeComposite, newShapeComposite } from "../../../shapeComposite";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { findexSortFn, mergeMap } from "../../../../utils/commons";
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
            const nextComposite = getNextShapeComposite(shapeComposite, { update: patch });
            const layoutPatch = getNextBoardLayout(nextComposite, laneShapes[0].parentId!);
            const adjustedPatch = getPatchAfterLayouts(shapeComposite, { update: mergeMap(layoutPatch, patch) });
            ctx.patchShapes(adjustedPatch);
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
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
      const shapeComposite = ctx.getShapeComposite();
      const rect = shapeComposite.getWrapperRectForShapes(laneShapes);
      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
      scaleGlobalAlpha(renderCtx, 0.3, () => {
        renderCtx.fill();
      });

      boardLaneMovingHandler.render(renderCtx, style, scale, boardMovingHitResult);

      if (diff) {
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
