import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
  startTextEditingIfPossible,
} from "../commons";
import { newSelectionHubState } from "../selectionHubState";
import { CONTEXT_MENU_SHAPE_SELECTED_ITEMS } from "../contextMenuItems";
import { getNextShapeComposite } from "../../../shapeComposite";
import { TreeNodeShape } from "../../../../shapes/tree/treeNode";
import {
  generateFindexNextAt,
  generateFindexPreviousAt,
  getNextTreeLayout,
  getPatchToDisconnectBranch,
  getTreeBranchIds,
  isValidTreeNode,
  newTreeHandler,
} from "../../../shapeHandlers/treeHandler";
import { canHaveText, createShape } from "../../../../shapes";
import { getDocAttributes, getInitialOutput } from "../../../../utils/textEditor";
import { BoundingBox, HitResult, isSameHitResult, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { newRotatingState } from "../rotatingState";
import { mergeMap } from "../../../../utils/commons";
import { newSingleSelectedState } from "../singleSelectedState";
import { ShapeHandler } from "../../../shapeHandlers/core";

export function newTreeNodeSelectedState(): AppCanvasState {
  let treeNodeShape: TreeNodeShape;
  let treeHandler: ShapeHandler;
  let boundingBox: BoundingBox;
  let boundingHitResult: HitResult | undefined;

  return {
    getLabel: () => "TreeNodeSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      ctx.setCommandExams([]);

      const shapeComposite = ctx.getShapeComposite();
      treeNodeShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as TreeNodeShape;
      if (!isValidTreeNode(shapeComposite, treeNodeShape)) {
        return newSingleSelectedState;
      }

      treeHandler = newTreeHandler({ getShapeComposite: ctx.getShapeComposite, targetId: treeNodeShape.id });

      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(treeNodeShape),
        styleScheme: ctx.getStyleScheme(),
      });
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCursor();
      ctx.setCommandExams();
      ctx.setContextMenuList();
    },
    handleEvent: (ctx, event) => {
      if (!treeNodeShape) return newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              const treeHitResult = treeHandler.hitTest(event.data.point, ctx.getScale());
              treeHandler.saveHitResult(treeHitResult);
              if (treeHitResult) {
                const shapeComposite = ctx.getShapeComposite();
                const treeRootId = treeNodeShape.parentId!;

                if (treeHitResult.type === -1) {
                  // Disconnect this branch and make it new tree.
                  const shapePatch = getPatchToDisconnectBranch(shapeComposite, treeNodeShape.id);
                  // Need to recalculate original tree's layout.
                  const nextComposite = getNextShapeComposite(shapeComposite, { update: shapePatch });
                  const treePatch = getNextTreeLayout(nextComposite, treeRootId);
                  ctx.patchShapes(mergeMap(shapePatch, treePatch));
                  return;
                }

                let treeNode: TreeNodeShape;
                if (treeHitResult.type === 0) {
                  treeNode = createShape<TreeNodeShape>(shapeComposite.getShapeStruct, "tree_node", {
                    ...treeNodeShape,
                    id: ctx.generateUuid(),
                    findex: generateFindexPreviousAt(shapeComposite, treeNodeShape.id),
                    parentId: treeRootId,
                    treeParentId: treeNodeShape.treeParentId,
                    direction: treeHitResult.direction,
                  });
                } else if (treeHitResult.type === 1) {
                  treeNode = createShape<TreeNodeShape>(shapeComposite.getShapeStruct, "tree_node", {
                    ...treeNodeShape,
                    id: ctx.generateUuid(),
                    findex: generateFindexNextAt(shapeComposite, treeNodeShape.id),
                    parentId: treeRootId,
                    treeParentId: treeNodeShape.treeParentId,
                    direction: treeHitResult.direction,
                  });
                } else {
                  treeNode = createShape<TreeNodeShape>(shapeComposite.getShapeStruct, "tree_node", {
                    ...treeNodeShape,
                    id: ctx.generateUuid(),
                    findex: ctx.createLastIndex(),
                    parentId: treeRootId,
                    treeParentId: treeNodeShape.id,
                    direction: treeHitResult.direction,
                  });
                }

                const nextComposite = getNextShapeComposite(shapeComposite, {
                  add: [treeNode],
                });
                const patch = getNextTreeLayout(nextComposite, treeRootId);
                treeNode = { ...treeNode, ...patch[treeNode.id] };
                delete patch[treeNode.id];

                const treeNodeShapeDoc = ctx.getDocumentMap()[treeNodeShape.id];
                ctx.addShapes(
                  [treeNode],
                  canHaveText(ctx.getShapeStruct, treeNode)
                    ? { [treeNode.id]: getInitialOutput(getDocAttributes(treeNodeShapeDoc)) }
                    : undefined,
                  patch,
                );
                ctx.selectShape(treeNode.id);
                return;
              }

              const hitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
              if (hitResult) {
                switch (hitResult.type) {
                  case "corner":
                  case "segment":
                    return () => newResizingState({ boundingBox, hitResult });
                  case "rotation":
                    return () => newRotatingState({ boundingBox });
                }
              }

              return handleCommonPointerDownLeftOnSingleSelection(
                ctx,
                event,
                treeNodeShape.id,
                ctx.getShapeComposite().getSelectionScope(treeNodeShape),
              );
            }
            case 1:
              return { type: "stack-resume", getState: newPanningState };
            case 2: {
              return handleCommonPointerDownRightOnSingleSelection(
                ctx,
                event,
                treeNodeShape.id,
                ctx.getShapeComposite().getSelectionScope(treeNodeShape),
              );
            }
            default:
              return;
          }
        case "pointerdoubledown": {
          const hitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
          if (hitResult) {
            return startTextEditingIfPossible(ctx, treeNodeShape.id, event.data.point);
          }
          return;
        }
        case "pointerhover": {
          const result = treeHandler.hitTest(event.data.current, ctx.getScale());
          if (treeHandler.saveHitResult(result)) {
            ctx.redraw();
          }
          if (result) return;

          const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (!isSameHitResult(boundingHitResult, hitBounding)) {
            boundingHitResult = hitBounding;
            ctx.redraw();
          }

          return handleIntransientEvent(ctx, event);
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
            case "Backspace":
              ctx.deleteShapes(getTreeBranchIds(ctx.getShapeComposite(), [treeNodeShape.id]));
              return;
            default:
              return handleIntransientEvent(ctx, event);
          }
        case "contextmenu":
          ctx.setContextMenuList({
            items: CONTEXT_MENU_SHAPE_SELECTED_ITEMS,
            point: event.data.point,
          });
          return;
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render: (ctx, renderCtx) => {
      treeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
      boundingBox.render(renderCtx, undefined, boundingHitResult, ctx.getScale());
    },
  };
}
