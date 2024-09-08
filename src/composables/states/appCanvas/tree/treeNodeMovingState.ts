import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { TreeNodeShape, getBoxAlignByDirection } from "../../../../shapes/tree/treeNode";
import { newTreeNodeMovingHandler, isValidTreeNode, getTreeBranchIds } from "../../../shapeHandlers/treeHandler";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
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
      if (!treeNodeShape) return ctx.states.newSelectionHubState;

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
            ctx.patchShapes(getPatchByLayouts(shapeComposite, { update: patch }));
          }
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          const shapeComposite = ctx.getShapeComposite();
          const shape = shapeComposite.mergedShapeMap[treeNodeShape.id];
          if (!shape) return ctx.states.newSelectionHubState;

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
      treeMovingHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
}
