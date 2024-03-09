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
import { SmartBranchHandler, SmartBranchHitResult, newSmartBranchHandler } from "../../smartBranchHandler";
import { getOuterRectangle } from "okageo";
import { newSelectionHubState } from "./selectionHubState";
import { CONTEXT_MENU_SHAPE_SELECTED_ITEMS } from "./contextMenuItems";
import { isGroupShape } from "../../../shapes/group";
import { ShapeSelectionScope } from "../../../shapes/core";
import { defineIntransientState } from "./intransientState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";

export const newSingleSelectedState = defineIntransientState(() => {
  let selectedId: string | undefined;
  let boundingBox: BoundingBox;
  let smartBranchHandler: SmartBranchHandler | undefined;
  let smartBranchHitResult: SmartBranchHitResult | undefined;
  let selectionScope: ShapeSelectionScope | undefined;
  let isGroupShapeSelected: boolean;

  return {
    getLabel: () => "SingleSelected",
    onStart: (ctx) => {
      const shapeComposite = ctx.getShapeComposite();
      selectedId = ctx.getLastSelectedShapeId();
      const shape = shapeComposite.shapeMap[selectedId ?? ""];
      if (!shape) return;

      ctx.showFloatMenu();
      selectionScope = shapeComposite.getSelectionScope(shape);
      isGroupShapeSelected = isGroupShape(shape);

      ctx.setCommandExams(getCommonCommandExams(ctx));

      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(shape),
      });

      if (!shapeComposite.hasParent(shape) && canAttachSmartBranch(ctx.getShapeStruct, shape)) {
        smartBranchHandler = newSmartBranchHandler({
          ...ctx,
          bounds: getOuterRectangle([boundingBox.path]),
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
                }
              }

              const shapeComposite = ctx.getShapeComposite();
              const shape = shapeComposite.shapeMap[selectedId];

              if (smartBranchHandler) {
                smartBranchHitResult = smartBranchHandler.hitTest(event.data.point, shape, ctx.getScale());
                if (smartBranchHitResult) {
                  const branchShapes = smartBranchHandler.createBranch(smartBranchHitResult, shape, ctx.generateUuid);
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
        case "pointerdoubledown": {
          const hitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
          if (hitResult) {
            // TODO: It'd be better to make "GroupSelectedState"
            if (isGroupShapeSelected) {
              const shapeComposite = ctx.getShapeComposite();
              const child = shapeComposite.findShapeAt(
                event.data.point,
                { parentId: selectedId },
                undefined,
                undefined,
                ctx.getScale(),
              );
              if (child) {
                ctx.selectShape(child.id);
              }
            } else {
              return startTextEditingIfPossible(ctx, selectedId, event.data.point);
            }
          }
          return;
        }
        case "pointerhover": {
          const _hitResult = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (boundingBox.saveHitResult(_hitResult)) {
            ctx.redraw();
          }

          if (!_hitResult) {
            const shape = ctx.getShapeComposite().shapeMap[selectedId];
            const current = smartBranchHitResult?.index;

            if (smartBranchHandler) {
              smartBranchHitResult = smartBranchHandler.hitTest(event.data.current, shape, ctx.getScale());
              if (current !== smartBranchHitResult?.index) {
                ctx.redraw();
                return;
              }
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
      const shape = ctx.getShapeComposite().shapeMap[selectedId ?? ""];
      if (!shape) return;

      boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
      smartBranchHandler?.render(renderCtx, ctx.getStyleScheme(), ctx.getScale(), smartBranchHitResult);
    },
  };
});
