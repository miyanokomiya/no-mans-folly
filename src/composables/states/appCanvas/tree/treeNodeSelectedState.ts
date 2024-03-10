import type { AppCanvasStateContext } from "../core";
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
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { newRotatingState } from "../rotatingState";
import { mergeMap } from "../../../../utils/commons";
import { newSingleSelectedState } from "../singleSelectedState";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";

export const newTreeNodeSelectedState = defineIntransientState(() => {
  let treeNodeShape: TreeNodeShape;
  let treeHandler: ReturnType<typeof newTreeHandler>;
  let boundingBox: BoundingBox;

  function addNewNode(ctx: AppCanvasStateContext, treeNode: TreeNodeShape) {
    if (!treeNodeShape.parentId) return;

    const shapeComposite = ctx.getShapeComposite();
    const nextComposite = getNextShapeComposite(shapeComposite, {
      add: [treeNode],
    });
    const patch = getNextTreeLayout(nextComposite, treeNodeShape.parentId);
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
  }

  return {
    getLabel: () => "TreeNodeSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      ctx.setCommandExams([COMMAND_EXAM_SRC.TREE_NEW_CHILD, COMMAND_EXAM_SRC.TREE_NEW_SIBLING]);

      const shapeComposite = ctx.getShapeComposite();
      treeNodeShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as TreeNodeShape;
      if (!isValidTreeNode(shapeComposite, treeNodeShape)) {
        return newSingleSelectedState;
      }

      treeHandler = newTreeHandler({ getShapeComposite: ctx.getShapeComposite, targetId: treeNodeShape.id });

      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(treeNodeShape),
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
                  });
                } else if (treeHitResult.type === 1) {
                  treeNode = createShape<TreeNodeShape>(shapeComposite.getShapeStruct, "tree_node", {
                    ...treeNodeShape,
                    id: ctx.generateUuid(),
                    findex: generateFindexNextAt(shapeComposite, treeNodeShape.id),
                  });
                } else {
                  treeNode = createShape<TreeNodeShape>(shapeComposite.getShapeStruct, "tree_node", {
                    ...treeNodeShape,
                    id: ctx.generateUuid(),
                    findex: ctx.createLastIndex(),
                    treeParentId: treeNodeShape.id,
                  });
                }

                addNewNode(ctx, treeNode);
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
              return () => newPointerDownEmptyState(event.data.options);
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
        case "pointerhover": {
          const result = treeHandler.hitTest(event.data.current, ctx.getScale());
          if (treeHandler.saveHitResult(result)) {
            ctx.redraw();
          }
          if (result) return;

          const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (boundingBox.saveHitResult(hitBounding)) {
            ctx.redraw();
          }
          break;
        }
        case "keydown":
          switch (event.data.key) {
            case "Tab": {
              event.data.prevent?.();
              const shapeComposite = ctx.getShapeComposite();
              const treeNode = createShape<TreeNodeShape>(shapeComposite.getShapeStruct, "tree_node", {
                ...treeNodeShape,
                id: ctx.generateUuid(),
                findex: ctx.createLastIndex(),
                treeParentId: treeNodeShape.id,
              });
              addNewNode(ctx, treeNode);
              return;
            }
            case "Enter": {
              event.data.prevent?.();
              if (event.data.shift) {
                const shapeComposite = ctx.getShapeComposite();
                const treeNode = createShape<TreeNodeShape>(shapeComposite.getShapeStruct, "tree_node", {
                  ...treeNodeShape,
                  id: ctx.generateUuid(),
                  findex: generateFindexNextAt(shapeComposite, treeNodeShape.id),
                });
                addNewNode(ctx, treeNode);
              } else {
                return startTextEditingIfPossible(ctx, treeNodeShape.id);
              }
              return;
            }
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
      boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
});
