import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleCommonShortcut,
  handleCommonTextStyle,
  handleCommonWheel,
  handleFileDrop,
  handleHistoryEvent,
  handleStateEvent,
  newShapeClipboard,
  startTextEditingIfPossible,
} from "../commons";
import { newSelectionHubState } from "../selectionHubState";
import { CONTEXT_MENU_ITEM_SRC, handleContextItemEvent } from "../contextMenuItems";
import { findBetterShapeAt, getNextShapeComposite } from "../../../shapeComposite";
import { TreeNodeShape } from "../../../../shapes/tree/treeNode";
import {
  TreeHandler,
  TreeHitResult,
  generateFindexNextAt,
  generateFindexPreviousAt,
  getNextTreeLayout,
  getPatchToDisconnectBranch,
  getTreeBranchIds,
  isSameTreeHitResult,
  isValidTreeNode,
  newTreeHandler,
} from "../../../treeHandler";
import { canHaveText, createShape } from "../../../../shapes";
import { getDocAttributes, getInitialOutput } from "../../../../utils/textEditor";
import { BoundingBox, HitResult, isSameHitResult, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { newRotatingState } from "../rotatingState";
import { mergeMap } from "../../../../utils/commons";
import { newSingleSelectedState } from "../singleSelectedState";

export function newTreeNodeSelectedState(): AppCanvasState {
  let treeNodeShape: TreeNodeShape;
  let treeHandler: TreeHandler;
  let treeHitResult: TreeHitResult | undefined;
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
              treeHitResult = treeHandler.hitTest(event.data.point, ctx.getScale());
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
          if (!isSameTreeHitResult(treeHitResult, result)) {
            ctx.redraw();
          }
          treeHitResult = result;
          if (treeHitResult) return;

          const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (!isSameHitResult(boundingHitResult, hitBounding)) {
            boundingHitResult = hitBounding;
            ctx.redraw();
          }
          if (boundingHitResult) {
            ctx.setCursor();
            return;
          }

          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.current, { parentId: treeNodeShape.id });
          ctx.setCursor(shapeAtPointer ? "pointer" : undefined);
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes(getTreeBranchIds(ctx.getShapeComposite(), [treeNodeShape.id]));
              return;
            default:
              return handleCommonShortcut(ctx, event);
          }
        case "wheel":
          handleCommonWheel(ctx, event);
          return;
        case "selection": {
          return newSelectionHubState;
        }
        case "shape-updated": {
          if (event.data.keys.has(treeNodeShape.id)) {
            return newSelectionHubState;
          }
          return;
        }
        case "text-style": {
          return handleCommonTextStyle(ctx, event);
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newSelectionHubState;
        case "state":
          return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady", "TextReady"]);
        case "contextmenu":
          ctx.setContextMenuList({
            items: [CONTEXT_MENU_ITEM_SRC.EXPORT_AS_PNG, CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG],
            point: event.data.point,
          });
          return;
        case "contextmenu-item": {
          return handleContextItemEvent(ctx, event);
        }
        case "copy": {
          const clipboard = newShapeClipboard(ctx);
          clipboard.onCopy(event.nativeEvent);
          return;
        }
        case "paste": {
          const clipboard = newShapeClipboard(ctx);
          clipboard.onPaste(event.nativeEvent);
          return;
        }
        case "file-drop": {
          handleFileDrop(ctx, event);
          return;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      treeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale(), treeHitResult);
      boundingBox.render(renderCtx, undefined, boundingHitResult, ctx.getScale());
    },
  };
}
