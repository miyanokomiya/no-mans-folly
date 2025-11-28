import { getCommonCommandExams, handleIntransientEvent, isShapeInteratctiveWithinViewport } from "./commons";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { applyCurvePath } from "../../../utils/renderer";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newResizingState } from "./resizingState";
import { newRotatingState } from "./rotatingState";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { CONTEXT_MENU_ITEM_SRC, getMenuItemsForSelectedShapes } from "./contextMenuItems";
import { canGroupShapes, findBetterShapeAt, getRotatedTargetBounds } from "../../shapeComposite";
import { ShapeSelectionScope, isSameShapeSelectionScope } from "../../../shapes/core";
import { defineIntransientState } from "./intransientState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";
import { ContextMenuItem } from "../types";
import { isGroupShape } from "../../../shapes/group";
import { MultipleSelectedHandler, newMultipleSelectedHandler } from "../../shapeHandlers/multipleSelectedHandler";
import { AppCanvasState, AppCanvasStateContext } from "./core";
import { getShapeStatusColor } from "./utils/style";
import { canShapesJoinAlignBox } from "../../alignHandler";

interface Option {
  // Once the bounding box is rotated, it's difficult to retrieve original bounding box.
  // Then, let this state receive concurrent bounding box.
  boundingBox?: BoundingBox;
}

export const newMultipleSelectedState = defineIntransientState((option?: Option) => {
  let selectedIdMap: { [id: string]: true };
  let boundingBox: BoundingBox;
  let scode: ShapeSelectionScope | undefined;
  let handler: MultipleSelectedHandler;

  function initHandlers(ctx: AppCanvasStateContext, rotation = 0) {
    const shapeComposite = ctx.getShapeComposite();
    const selectedIds = Object.keys(selectedIdMap);
    boundingBox = newBoundingBox({
      path: getRotatedTargetBounds(shapeComposite, selectedIds, rotation),
    });
    handler = newMultipleSelectedHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetIds: selectedIds,
      rotation: rotation,
    });
  }

  const render: AppCanvasState["render"] = (ctx, renderCtx) => {
    const scale = ctx.getScale();
    const style = ctx.getStyleScheme();
    const shapeComposite = ctx.getShapeComposite();
    const shapes = Object.entries(shapeComposite.mergedShapeMap)
      .filter(([id]) => selectedIdMap[id])
      .map(([, s]) => s);

    shapes.forEach((s) => {
      applyStrokeStyle(renderCtx, {
        color: getShapeStatusColor(style, s) ?? style.selectionSecondaly,
        width: 2 * scale,
      });
      renderCtx.beginPath();
      shapeComposite.getHighlightPaths(s).forEach((path) => applyCurvePath(renderCtx, path.path, path.curves));
      renderCtx.stroke();
    });

    boundingBox.render(renderCtx, ctx.getStyleScheme(), scale);
    handler.render(renderCtx, style, scale);
  };

  return {
    getLabel: () => "MultipleSelected",
    onStart: (ctx) => {
      selectedIdMap = ctx.getSelectedShapeIdMap();
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const selectedIds = Object.keys(selectedIdMap);

      // Prevent selecting shapes that have different parents
      {
        let firstScope: ShapeSelectionScope | undefined;
        let multipleScope = false;
        selectedIds.forEach((id) => {
          const shape = shapeMap[id];
          const scope = shapeComposite.getSelectionScope(shape);
          if (!firstScope) {
            firstScope = scope;
          } else if (!isSameShapeSelectionScope(firstScope, scope)) {
            multipleScope = true;
          }
        });

        if (multipleScope) {
          const nextSelected = selectedIds.filter((id) => {
            const shape = shapeMap[id];
            return isSameShapeSelectionScope(firstScope, shapeComposite.getSelectionScope(shape));
          });
          ctx.multiSelectShapes(nextSelected);
          return ctx.states.newSelectionHubState;
        }

        scode = firstScope;
      }

      ctx.showFloatMenu();
      ctx.setCommandExams(getCommonCommandExams(ctx));

      // Recalculate the bounding because shapes aren't always transformed along with the bounding box.
      // => Also, need to conserve the rotation.
      initHandlers(ctx, option?.boundingBox?.getRotation() ?? 0);
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setContextMenuList();
      ctx.setCommandExams();
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      if (!selectedIdMap) return;

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
                    return () => ctx.states.newMovingHubState({ boundingBox });
                }
              }

              const handlerHitResult = handler.hitTest(event.data.point, ctx.getScale());
              if (handlerHitResult) {
                switch (handlerHitResult.type) {
                  case "rotation": {
                    initHandlers(ctx, handlerHitResult.info[1]);
                    ctx.redraw();
                    return;
                  }
                }
              }

              const shapeComposite = ctx.getShapeComposite();
              const shape = findBetterShapeAt(shapeComposite, event.data.point, scode, undefined, ctx.getScale());
              if (!shape || !isShapeInteratctiveWithinViewport(ctx, shape)) {
                return () =>
                  newPointerDownEmptyState({ ...event.data.options, boundingBox, renderWhilePanning: render });
              }

              const concurrent = selectedIdMap[shape.id];
              if (event.data.options.ctrl) {
                ctx.selectShape(shape.id, true);
                if (concurrent) return;
                return () => ctx.states.newSelectedByPointerOnState({ concurrent: selectedIdMap[shape.id] });
              }

              if (concurrent) {
                if (event.data.options.alt) {
                  return newDuplicatingShapesState;
                } else {
                  return () => ctx.states.newMovingHubState({ boundingBox });
                }
              } else {
                ctx.selectShape(shape.id, false);
                if (event.data.options.alt) {
                  return newDuplicatingShapesState;
                } else {
                  return ctx.states.newSelectedByPointerOnState;
                }
              }
            }
            case 1:
              return () => newPointerDownEmptyState({ ...event.data.options, boundingBox, renderWhilePanning: render });
            case 2: {
              const shapeComposite = ctx.getShapeComposite();
              const shapeAtPointer = findBetterShapeAt(
                shapeComposite,
                event.data.point,
                scode,
                undefined,
                ctx.getScale(),
              );
              if (
                !shapeAtPointer ||
                selectedIdMap[shapeAtPointer.id] ||
                !isShapeInteratctiveWithinViewport(ctx, shapeAtPointer)
              )
                return;

              ctx.selectShape(shapeAtPointer.id, event.data.options.ctrl);
              return;
            }
            default:
              return;
          }
        case "pointerhover": {
          const hitResult = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (boundingBox.saveHitResult(hitResult)) {
            ctx.redraw();
          }

          const handerHitResult = handler.hitTest(event.data.current, ctx.getScale());
          if (handler.saveHitResult(handerHitResult)) {
            ctx.redraw();
          }

          break;
        }
        case "contextmenu": {
          const shapeComposite = ctx.getShapeComposite();
          const shapeMap = shapeComposite.shapeMap;
          const targetIds = Object.keys(ctx.getSelectedShapeIdMap());
          const targetShapes = targetIds.map((id) => shapeMap[id]).filter((s) => s);
          const items: ContextMenuItem[] = [];

          const canGroup = canGroupShapes(shapeComposite, targetIds);
          if (canGroup) {
            items.push(CONTEXT_MENU_ITEM_SRC.GROUP);
          }

          const groups = targetShapes.filter(isGroupShape);
          if (groups.length > 0) {
            items.push(CONTEXT_MENU_ITEM_SRC.UNGROUP);
          }

          if (canShapesJoinAlignBox(shapeComposite, targetShapes)) {
            items.push(CONTEXT_MENU_ITEM_SRC.ALIGN_LAYOUT);
          }

          if (canGroup) {
            items.push(CONTEXT_MENU_ITEM_SRC.CREATE_FRAME);
          }

          if (items.length > 0) {
            items.push(CONTEXT_MENU_ITEM_SRC.SEPARATOR);
          }

          ctx.setContextMenuList({
            items: [...items, ...getMenuItemsForSelectedShapes(ctx)],
            point: event.data.point,
          });
          return;
        }
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render,
  };
});
