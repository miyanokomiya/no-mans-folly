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
import { TreeRootShape } from "../../../../shapes/tree/treeRoot";
import {
  TreeHandler,
  TreeHitResult,
  getNextTreeLayout,
  isSameTreeHitResult,
  newTreeHandler,
} from "../../../treeHandler";
import { canHaveText, createShape } from "../../../../shapes";
import { TreeNodeShape } from "../../../../shapes/tree/treeNode";
import { getInitialOutput } from "../../../../utils/textEditor";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { BoundingBox, HitResult, isSameHitResult, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { newRotatingState } from "../rotatingState";

export function newTreeRootSelectedState(): AppCanvasState {
  let treeRootShape: TreeRootShape;
  let treeHandler: TreeHandler;
  let treeHitResult: TreeHitResult | undefined;
  let boundingBox: BoundingBox;
  let boundingHitResult: HitResult | undefined;

  return {
    getLabel: () => "TreeRootSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      treeRootShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as TreeRootShape;
      ctx.setCommandExams([]);
      treeHandler = newTreeHandler({ getShapeComposite: ctx.getShapeComposite, targetId: treeRootShape.id });

      const shapeComposite = ctx.getShapeComposite();
      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(treeRootShape),
        styleScheme: ctx.getStyleScheme(),
        scale: ctx.getScale(),
      });
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCursor();
      ctx.setCommandExams();
      ctx.setContextMenuList();
    },
    handleEvent: (ctx, event) => {
      if (!treeRootShape) return newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              treeHitResult = treeHandler.hitTest(event.data.point, ctx.getScale());
              if (treeHitResult) {
                if (treeHitResult.type === -1) {
                  return;
                }

                const shapeComposite = ctx.getShapeComposite();
                let treeNode = createShape<TreeNodeShape>(shapeComposite.getShapeStruct, "tree_node", {
                  id: ctx.generateUuid(),
                  findex: ctx.createLastIndex(),
                  parentId: treeRootShape.id,
                  treeParentId: treeRootShape.id,
                  direction: treeHitResult.direction,
                });

                const nextComposite = getNextShapeComposite(shapeComposite, {
                  add: [treeNode],
                });
                const patch = getNextTreeLayout(nextComposite, treeRootShape.id);
                treeNode = { ...treeNode, ...patch[treeNode.id] };
                delete patch[treeNode.id];

                ctx.addShapes(
                  [treeNode],
                  canHaveText(ctx.getShapeStruct, treeNode) ? { [treeNode.id]: getInitialOutput() } : undefined,
                  patch,
                );
                ctx.selectShape(treeNode.id);
                return;
              }

              const hitResult = boundingBox.hitTest(event.data.point);
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
                treeRootShape.id,
                ctx.getShapeComposite().getSelectionScope(treeRootShape),
              );
            }
            case 1:
              return { type: "stack-resume", getState: newPanningState };
            case 2: {
              return handleCommonPointerDownRightOnSingleSelection(
                ctx,
                event,
                treeRootShape.id,
                ctx.getShapeComposite().getSelectionScope(treeRootShape),
              );
            }
            default:
              return;
          }
        case "pointerdoubledown": {
          const hitResult = boundingBox.hitTest(event.data.point);
          if (hitResult) {
            return startTextEditingIfPossible(ctx, treeRootShape.id, event.data.point);
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

          const hitBounding = boundingBox.hitTest(event.data.current);
          if (!isSameHitResult(boundingHitResult, hitBounding)) {
            boundingHitResult = hitBounding;
            ctx.redraw();
          }
          if (boundingHitResult) {
            ctx.setCursor();
            return;
          }

          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.current, { parentId: treeRootShape.id });
          ctx.setCursor(shapeAtPointer ? "pointer" : undefined);
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes([treeRootShape.id]);
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
          if (event.data.keys.has(treeRootShape.id)) {
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
      const shapeComposite = ctx.getShapeComposite();
      const rect = shapeComposite.getWrapperRectForShapes(shapeComposite.getAllBranchMergedShapes([treeRootShape.id]));
      applyStrokeStyle(renderCtx, { color: ctx.getStyleScheme().selectionSecondaly, width: ctx.getScale() * 2 });
      renderCtx.beginPath();
      renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
      renderCtx.stroke();

      treeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale(), treeHitResult);
      boundingBox.render(renderCtx, undefined, boundingHitResult);
    },
  };
}
