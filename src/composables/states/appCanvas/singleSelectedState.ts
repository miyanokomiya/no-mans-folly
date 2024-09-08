import { canAttachSmartBranch } from "../../../shapes";
import {
  getCommonCommandExams,
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
  startTextEditingIfPossible,
} from "./commons";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newRotatingState } from "./rotatingState";
import { newResizingState } from "./resizingState";
import { SmartBranchHandler, newSmartBranchHandler } from "../../smartBranchHandler";
import { newSelectionHubState } from "./selectionHubState";
import { getMenuItemsForSelectedShapes } from "./contextMenuItems";
import { ShapeSelectionScope } from "../../../shapes/core";
import { defineIntransientState } from "./intransientState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";
import { newMovingHubState } from "./movingHubState";

export const newSingleSelectedState = defineIntransientState(() => {
  let selectedId: string | undefined;
  let boundingBox: BoundingBox;
  let smartBranchHandler: SmartBranchHandler | undefined;
  let selectionScope: ShapeSelectionScope | undefined;

  return {
    getLabel: () => "SingleSelected",
    onStart: (ctx) => {
      const shapeComposite = ctx.getShapeComposite();
      selectedId = ctx.getLastSelectedShapeId();
      const shape = shapeComposite.shapeMap[selectedId ?? ""];
      if (!shape) return;

      ctx.showFloatMenu();
      selectionScope = shapeComposite.getSelectionScope(shape);

      ctx.setCommandExams(getCommonCommandExams(ctx));

      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(shape),
        locked: shape.locked,
      });

      if (!shapeComposite.hasParent(shape) && canAttachSmartBranch(ctx.getShapeStruct, shape)) {
        smartBranchHandler = newSmartBranchHandler({
          ...ctx,
          targetId: shape.id,
        });
      }
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setContextMenuList();
      ctx.setCommandExams();
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      if (!selectedId) return newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              const hitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
              if (hitResult) {
                switch (hitResult.type) {
                  case "corner":
                  case "segment":
                    return () => newResizingState({ boundingBox, hitResult });
                  case "rotation":
                    return () => newRotatingState({ boundingBox });
                  case "move":
                    return () => newMovingHubState({ boundingBox });
                }
              }

              if (smartBranchHandler) {
                const smartBranchHitResult = smartBranchHandler.hitTest(event.data.point, ctx.getScale());
                if (smartBranchHitResult) {
                  const branchShapes = smartBranchHandler.createBranch(smartBranchHitResult, ctx.generateUuid);
                  ctx.addShapes(branchShapes);
                  ctx.selectShape(branchShapes[0].id);
                  return;
                }
              }

              return handleCommonPointerDownLeftOnSingleSelection(ctx, event, selectedId, selectionScope);
            }
            case 1:
              return () => newPointerDownEmptyState(event.data.options);
            case 2: {
              return handleCommonPointerDownRightOnSingleSelection(ctx, event, selectedId, selectionScope);
            }
            default:
              return;
          }
        case "pointerdoubleclick": {
          const hitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
          if (hitResult) {
            return startTextEditingIfPossible(ctx, selectedId, event.data.point);
          }
          return;
        }
        case "pointerhover": {
          const _hitResult = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (boundingBox.saveHitResult(_hitResult)) {
            ctx.redraw();
          }

          if (!_hitResult && smartBranchHandler) {
            const smartBranchHitResult = smartBranchHandler.hitTest(event.data.current, ctx.getScale());
            if (smartBranchHandler.saveHitResult(smartBranchHitResult)) {
              ctx.redraw();
              return;
            }
          }
          break;
        }
        case "keydown":
          switch (event.data.key) {
            case "Enter":
              event.data.prevent?.();
              return startTextEditingIfPossible(ctx, selectedId);
            default:
              return handleIntransientEvent(ctx, event);
          }
        case "contextmenu": {
          ctx.setContextMenuList({
            items: getMenuItemsForSelectedShapes(ctx),
            point: event.data.point,
          });
          return;
        }
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render: (ctx, renderCtx) => {
      const shape = ctx.getShapeComposite().shapeMap[selectedId ?? ""];
      if (!shape) return;

      boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
      smartBranchHandler?.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
});
