import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
} from "../commons";
import { newSelectionHubState } from "../selectionHubState";
import { getMenuItemsForSelectedShapes } from "../contextMenuItems";
import { TreeRootShape } from "../../../../shapes/tree/treeRoot";
import { newTreeHandler } from "../../../shapeHandlers/treeHandler";
import { canHaveText, createShape } from "../../../../shapes";
import { TreeNodeShape } from "../../../../shapes/tree/treeNode";
import { getInitialOutput } from "../../../../utils/textEditor";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { newRotatingState } from "../rotatingState";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";

export const newTreeRootSelectedState = defineIntransientState(() => {
  let treeRootShape: TreeRootShape;
  let treeHandler: ReturnType<typeof newTreeHandler>;
  let boundingBox: BoundingBox;

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
        locked: treeRootShape.locked,
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
              const treeHitResult = treeHandler.hitTest(event.data.point, ctx.getScale());
              treeHandler.saveHitResult(treeHitResult);
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
                  dropdown: treeHitResult.dropdown,
                });

                const patch = getPatchByLayouts(shapeComposite, { add: [treeNode] });
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
                treeRootShape.id,
                ctx.getShapeComposite().getSelectionScope(treeRootShape),
              );
            }
            case 1:
              return () => newPointerDownEmptyState(event.data.options);
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
        case "contextmenu":
          ctx.setContextMenuList({
            items: getMenuItemsForSelectedShapes(ctx),
            point: event.data.point,
          });
          return;
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render: (ctx, renderCtx) => {
      const shapeComposite = ctx.getShapeComposite();
      const rect = shapeComposite.getWrapperRectForShapes(shapeComposite.getAllBranchMergedShapes([treeRootShape.id]));
      applyStrokeStyle(renderCtx, { color: ctx.getStyleScheme().selectionSecondaly, width: ctx.getScale() * 2 });
      renderCtx.beginPath();
      renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
      renderCtx.stroke();

      treeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
      boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
});
