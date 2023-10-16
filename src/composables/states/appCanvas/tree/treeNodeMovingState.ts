import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import {
  TreeNodeShape,
  getBoxAlignByDirection,
} from "../../../../shapes/tree/treeNode";
import {
  TreeNodeMovingHandler,
  newTreeNodeMovingHandler,
  TreeNodeMovingResult,
  isSameTreeNodeMovingResult,
  getNextTreeLayout,
} from "../../../treeHandler";
import { getNextShapeComposite } from "../../../shapeComposite";
import { mergeMap } from "../../../../utils/commons";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";

interface Option {
  targetId: string;
}

export function newTreeNodeMovingState(option: Option): AppCanvasState {
  let treeNodeShape: TreeNodeShape;
  let treeMovingHandler: TreeNodeMovingHandler;
  let movingResult: TreeNodeMovingResult | undefined;

  const initData = (ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    treeNodeShape = shapeComposite.shapeMap[option.targetId] as TreeNodeShape;
    treeMovingHandler = newTreeNodeMovingHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: treeNodeShape.id,
    });
  };

  return {
    getLabel: () => "TreeNodeMoving",
    onStart: (ctx) => {
      ctx.startDragging();
      initData(ctx);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      if (!treeNodeShape) return newSelectionHubState;

      switch (event.type) {
        case "pointermove": {
          const result = treeMovingHandler.moveTest(event.data.current);
          if (!isSameTreeNodeMovingResult(result, movingResult)) {
            ctx.redraw();
            movingResult = result;
          }
          return;
        }
        case "pointerup": {
          if (movingResult) {
            // All nodes in the branch need to change their direction along with the new direction.
            const directionPatch =
              treeNodeShape.direction !== movingResult.direction
                ? treeMovingHandler.branchIds.reduce<{ [id: string]: Partial<TreeNodeShape> }>((p, id) => {
                    p[id] = { direction: movingResult!.direction };
                    return p;
                  }, {})
                : {};

            const { vAlign, hAlign } = getBoxAlignByDirection(movingResult.direction);
            const patch = {
              ...directionPatch,
              [treeNodeShape.id]: {
                findex: movingResult.findex,
                direction: movingResult.direction,
                treeParentId: movingResult.treeParentId,
                vAlign,
                hAlign,
              },
            };

            const shapeComposite = ctx.getShapeComposite();
            const nextComposite = getNextShapeComposite(shapeComposite, { update: patch });
            const layoutPatch = getNextTreeLayout(nextComposite, treeNodeShape.parentId!);
            const adjustedPatch = getPatchAfterLayouts(shapeComposite, { update: mergeMap(layoutPatch, patch) });
            ctx.patchShapes(adjustedPatch);
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        case "shape-updated": {
          const shapeComposite = ctx.getShapeComposite();
          const shape = shapeComposite.mergedShapeMap[treeNodeShape.id];
          if (!shape) return newSelectionHubState;

          const isTreeChanged = Array.from(event.data.keys).some(
            (id) => shapeComposite.mergedShapeMap[id].parentId === treeNodeShape.parentId,
          );
          if (isTreeChanged) {
            initData(ctx);
          }
          return;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      applyFillStyle(renderCtx, { color: style.selectionSecondaly });
      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: ctx.getScale() * 2 });

      const shapeComposite = ctx.getShapeComposite();
      const rect = shapeComposite.getWrapperRectForShapes(
        treeMovingHandler.branchIds.map((id) => shapeComposite.mergedShapeMap[id]),
      );
      renderCtx.beginPath();
      renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
      scaleGlobalAlpha(renderCtx, 0.3, () => {
        renderCtx.fill();
      });
      renderCtx.stroke();

      treeMovingHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale(), movingResult);
    },
  };
}
