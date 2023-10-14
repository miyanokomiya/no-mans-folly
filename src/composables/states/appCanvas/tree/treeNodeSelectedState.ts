import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleCommonShortcut,
  handleFileDrop,
  handleHistoryEvent,
  handleStateEvent,
  newShapeClipboard,
  startTextEditingIfPossible,
} from "../commons";
import { newSelectionHubState } from "../selectionHubState";
import { CONTEXT_MENU_ITEM_SRC, handleContextItemEvent } from "../contextMenuItems";
import { findBetterShapeAt, newShapeComposite } from "../../../shapeComposite";
import { TreeNodeShape } from "../../../../shapes/tree/treeNode";
import {
  TreeHandler,
  TreeHitResult,
  getNextTreeLayout,
  getTreeBranchIds,
  isSameTreeHitResult,
  newTreeHandler,
} from "../../../treeHandler";
import { canHaveText, createShape } from "../../../../shapes";
import { getInitialOutput } from "../../../../utils/textEditor";

export function newTreeNodeSelectedState(): AppCanvasState {
  let treeNodeShape: TreeNodeShape;
  let treeHandler: TreeHandler;
  let hitResult: TreeHitResult | undefined;

  return {
    getLabel: () => "TreeNodeSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      treeNodeShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as TreeNodeShape;
      ctx.setCommandExams([]);
      treeHandler = newTreeHandler({ getShapeComposite: ctx.getShapeComposite, targetId: treeNodeShape.id });
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
              hitResult = treeHandler.hitTest(event.data.point, ctx.getScale());
              if (hitResult) {
                const shapeComposite = ctx.getShapeComposite();
                const treeRootId = treeNodeShape.parentId!;
                let treeNode = createShape<TreeNodeShape>(shapeComposite.getShapeStruct, "tree_node", {
                  id: ctx.generateUuid(),
                  findex: ctx.createLastIndex(),
                  parentId: treeRootId,
                  treeParentId: treeNodeShape.id,
                  direction: hitResult.direction,
                });

                const nextComposite = newShapeComposite({
                  getStruct: shapeComposite.getShapeStruct,
                  shapes: [...shapeComposite.shapes, treeNode],
                });
                const patch = getNextTreeLayout(nextComposite, treeRootId);
                treeNode = { ...treeNode, ...patch[treeNode.id] };
                delete patch[treeNode.id];

                ctx.addShapes(
                  [treeNode],
                  canHaveText(ctx.getShapeStruct, treeNode) ? { [treeNode.id]: getInitialOutput() } : undefined,
                  patch,
                );
                return;
              }

              return handleCommonPointerDownLeftOnSingleSelection(ctx, event, treeNodeShape.id, treeNodeShape.id);
            }
            case 1:
              return { type: "stack-resume", getState: newPanningState };
            case 2: {
              return handleCommonPointerDownRightOnSingleSelection(ctx, event, treeNodeShape.id, treeNodeShape.id);
            }
            default:
              return;
          }
        case "pointerdoubledown": {
          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.point);
          if (shapeAtPointer?.id === treeNodeShape.id) {
            return startTextEditingIfPossible(ctx, treeNodeShape.id, event.data.point);
          }
          return;
        }
        case "pointerhover": {
          const result = treeHandler.hitTest(event.data.current, ctx.getScale());
          if (!isSameTreeHitResult(hitResult, result)) {
            ctx.redraw();
          }
          hitResult = result;
          if (hitResult) return;

          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.current, treeNodeShape.id);
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
          ctx.zoomView(event.data.delta.y);
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
      treeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale(), hitResult);
    },
  };
}
