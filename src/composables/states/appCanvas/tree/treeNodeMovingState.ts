import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { TreeNodeShape, getBoxAlignByDirection } from "../../../../shapes/tree/treeNode";
import {
  newTreeNodeMovingHandler,
  getNextTreeLayout,
  isValidTreeNode,
  getTreeBranchIds,
} from "../../../shapeHandlers/treeHandler";
import { getNextShapeComposite } from "../../../shapeComposite";
import { mergeMap } from "../../../../utils/commons";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { TransitionValue } from "../../core";
import { newTreeRootMovingState } from "./treeRootMovingState";

interface Option {
  targetId: string;
}

export function newTreeNodeMovingState(option: Option): AppCanvasState {
  let treeNodeShape: TreeNodeShape;
  let treeMovingHandler: ReturnType<typeof newTreeNodeMovingHandler>;
  let branchIds: string[];

  const initData = (ctx: AppCanvasStateContext): TransitionValue<AppCanvasStateContext> => {
    const shapeComposite = ctx.getShapeComposite();
    treeNodeShape = shapeComposite.shapeMap[option.targetId] as TreeNodeShape;
    if (!isValidTreeNode(shapeComposite, treeNodeShape)) {
      return () => newTreeRootMovingState({ targetId: option.targetId });
    }

    branchIds = getTreeBranchIds(ctx.getShapeComposite(), [treeNodeShape.id]);
    treeMovingHandler = newTreeNodeMovingHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: treeNodeShape.id,
    });
  };

  return {
    getLabel: () => "TreeNodeMoving",
    onStart: (ctx) => {
      ctx.startDragging();
      return initData(ctx);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      if (!treeNodeShape) return newSelectionHubState;

      switch (event.type) {
        case "pointermove": {
          const result = treeMovingHandler.hitTest(event.data.current, ctx.getScale());
          if (treeMovingHandler.saveHitResult(result)) {
            ctx.redraw();
          }
          return;
        }
        case "pointerup": {
          const movingResult = treeMovingHandler.retrieveHitResult();
          if (movingResult) {
            // All nodes in the branch need to change their direction along with the new direction.
            // So is dropdown.
            const directionPatch =
              treeNodeShape.direction !== movingResult.direction || treeNodeShape.dropdown !== movingResult.dropdown
                ? branchIds.reduce<{ [id: string]: Partial<TreeNodeShape> }>((p, id) => {
                    p[id] = { direction: movingResult!.direction, dropdown: movingResult!.dropdown };
                    return p;
                  }, {})
                : {};

            const { vAlign, hAlign } = getBoxAlignByDirection(movingResult.direction);
            const patch = {
              ...directionPatch,
              [treeNodeShape.id]: {
                findex: movingResult.findex,
                direction: movingResult.direction,
                dropdown: movingResult.dropdown,
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
            (id) => shapeComposite.mergedShapeMap[id]?.parentId === treeNodeShape.parentId,
          );
          if (isTreeChanged) {
            return initData(ctx);
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
      const rect = shapeComposite.getWrapperRectForShapes(branchIds.map((id) => shapeComposite.mergedShapeMap[id]));
      renderCtx.beginPath();
      renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
      scaleGlobalAlpha(renderCtx, 0.3, () => {
        renderCtx.fill();
      });
      renderCtx.stroke();

      treeMovingHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
}
