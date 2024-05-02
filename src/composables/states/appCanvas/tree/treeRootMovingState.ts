import type { AppCanvasState } from "../core";
import { newMovingShapeState } from "../movingShapeState";
import { findBetterShapeAt, getNextShapeComposite } from "../../../shapeComposite";
import { TreeShapeBase } from "../../../../shapes/tree/core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { applyPath, scaleGlobalAlpha } from "../../../../utils/renderer";
import {
  canBeGraftTarget,
  getNextTreeLayout,
  getPatchToGraftBranch,
  getTreeBranchIds,
} from "../../../shapeHandlers/treeHandler";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { mergeMap } from "../../../../utils/commons";
import { newSelectionHubState } from "../selectionHubState";

interface Option {
  targetId: string;
}

export function newTreeRootMovingState(option: Option): AppCanvasState {
  let graftTargetShape: TreeShapeBase | undefined;
  let movingState: AppCanvasState;

  return {
    getLabel: () => "TreeRootMoving",
    onStart: (ctx) => {
      movingState = newMovingShapeState();
      return movingState.onStart?.(ctx);
    },
    onEnd: (ctx) => {
      return movingState.onEnd?.(ctx);
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const shapeComposite = ctx.getShapeComposite();
          const branchIds = getTreeBranchIds(shapeComposite, [option.targetId]);
          const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.current, undefined, branchIds);
          graftTargetShape =
            shapeAtPointer && canBeGraftTarget(shapeComposite, shapeAtPointer) ? shapeAtPointer : undefined;
          break;
        }
        case "pointerup": {
          if (graftTargetShape) {
            const shapeComposite = ctx.getShapeComposite();
            const patch = getPatchToGraftBranch(shapeComposite, option.targetId, graftTargetShape.id);
            const nextComposite = getNextShapeComposite(shapeComposite, { update: patch });
            // Get new layout of the grafting-target tree.
            const layoutPatch = getNextTreeLayout(nextComposite, patch[option.targetId].parentId!);
            const adjustedPatch = getPatchAfterLayouts(shapeComposite, { update: mergeMap(layoutPatch, patch) });
            ctx.patchShapes(adjustedPatch);
            return newSelectionHubState;
          }
          break;
        }
      }

      return movingState.handleEvent(ctx, event);
    },
    render: (ctx, renderCtx) => {
      if (graftTargetShape) {
        const shapeComposite = ctx.getShapeComposite();
        const style = ctx.getStyleScheme();
        applyFillStyle(renderCtx, { color: style.selectionPrimary });
        const polygon = shapeComposite.getLocalRectPolygon(graftTargetShape);
        scaleGlobalAlpha(renderCtx, 0.5, () => {
          renderCtx.beginPath();
          applyPath(renderCtx, polygon, true);
          renderCtx.fill();
        });
      } else {
        movingState.render?.(ctx, renderCtx);
      }
    },
  };
}
