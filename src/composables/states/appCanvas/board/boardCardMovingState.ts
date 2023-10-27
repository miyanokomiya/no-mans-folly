import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { BoardCardShape, isBoardCardShape } from "../../../../shapes/board/boardCard";
import { BoardCardMovingHandler, BoardCardMovingHitResult, newBoardCardMovingHandler } from "../../../boardHandler";
import { applyPath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { newShapeComposite } from "../../../shapeComposite";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { findBackward, findexSortFn, mapReduce } from "../../../../utils/commons";
import { IVec2, add, sub } from "okageo";
import { newShapeRenderer } from "../../../shapeRenderer";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";
import { isBoardRootShape } from "../../../../shapes/board/boardRoot";

export function newBoardCardMovingState(option: { boardId: string }): AppCanvasState {
  let cardShapes: BoardCardShape[];
  let boardCardMovingHandler: BoardCardMovingHandler | undefined;
  let boardMovingHitResult: BoardCardMovingHitResult | undefined;
  let diff: IVec2;
  let boardId: string;

  function initHandler(ctx: AppCanvasStateContext) {
    boardCardMovingHandler = newBoardCardMovingHandler({
      getShapeComposite: ctx.getShapeComposite,
      boardId,
      cardIds: cardShapes.map((s) => s.id),
    });
  }

  return {
    getLabel: () => "BoardCardMoving",
    onStart: (ctx) => {
      ctx.setTmpShapeMap({});

      const shapeMap = ctx.getShapeComposite().shapeMap;
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      cardShapes = ids
        .map((id) => shapeMap[id])
        .filter(isBoardCardShape)
        .sort(findexSortFn);
      boardId = option.boardId;

      if (cardShapes.length === 0) {
        return { type: "break" };
      }

      initHandler(ctx);
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (event.data.ctrl) return { type: "break" };

          const shapeComposite = ctx.getShapeComposite();
          const board = findBackward(shapeComposite.shapes.filter(isBoardRootShape), (s) =>
            shapeComposite.isPointOn(s, event.data.current),
          );

          if (!board) return { type: "break" };

          if (boardId !== board.id) {
            boardId = board.id;
            initHandler(ctx);
            ctx.setTmpShapeMap({});
          }
          diff = sub(event.data.current, event.data.start);
          const result = boardCardMovingHandler?.hitTest(event.data.current);
          ctx.redraw();
          boardMovingHitResult = result;
          return;
        }
        case "pointerup": {
          const shapeComposite = ctx.getShapeComposite();
          const shapeMap = shapeComposite.shapeMap;

          if (event.data.options.ctrl) {
            const tmpShapeMap = ctx.getTmpShapeMap();
            // Disconnect cards from the board.
            const patch = mapReduce(tmpShapeMap, (v, id) => {
              const s = shapeMap[id];
              if (isBoardCardShape(s) && s.parentId) {
                return {
                  ...v,
                  parentId: undefined,
                  columnId: undefined,
                  layerId: undefined,
                  findex: ctx.createLastIndex(),
                };
              } else {
                return v;
              }
            });

            const layoutPatch = getPatchByLayouts(shapeComposite, {
              update: patch,
            });
            ctx.patchShapes(layoutPatch);
            return newSelectionHubState;
          }

          if (boardMovingHitResult) {
            const findexBetween = boardMovingHitResult.findexBetween;
            const columnId = boardMovingHitResult.columnId;
            const laneId = boardMovingHitResult.laneId;
            let findex = generateKeyBetweenAllowSame(findexBetween[0], findexBetween[1]);
            const patch = cardShapes.reduce<{ [id: string]: Partial<BoardCardShape> }>((p, s) => {
              p[s.id] = { findex, columnId, laneId };
              if (s.parentId !== boardId) {
                p[s.id].parentId = boardId;
              }
              findex = generateKeyBetweenAllowSame(findex, findexBetween[1]);
              return p;
            }, {});

            const layoutPatch = getPatchByLayouts(shapeComposite, {
              update: patch,
            });
            ctx.patchShapes(layoutPatch);
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        case "shape-updated": {
          if (boardCardMovingHandler?.isBoardChanged(Array.from(event.data.keys))) {
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

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      cardShapes.forEach((s) => {
        const path = shapeComposite.getLocalRectPolygon(s);
        renderCtx.beginPath();
        applyPath(renderCtx, path);
        scaleGlobalAlpha(renderCtx, 0.3, () => {
          renderCtx.fill();
        });
      });

      boardCardMovingHandler?.render(renderCtx, style, scale, boardMovingHitResult);

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
