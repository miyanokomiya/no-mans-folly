import { getCommonCommandExams, handleIntransientEvent, startTextEditingIfPossible } from "./commons";
import * as geometry from "../../../utils/geometry";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { applyPath } from "../../../utils/renderer";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newResizingState } from "./resizingState";
import { newRotatingState } from "./rotatingState";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { newSelectionHubState } from "./selectionHubState";
import { CONTEXT_MENU_SHAPE_SELECTED_ITEMS } from "./contextMenuItems";
import { findBetterShapeAt, getRotatedTargetBounds } from "../../shapeComposite";
import { newMovingHubState } from "./movingHubState";
import { ShapeSelectionScope, isSameShapeSelectionScope } from "../../../shapes/core";
import { defineIntransientState } from "./intransientState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";

interface Option {
  // Once the bounding box is rotated, it's difficult to retrieve original bounding box.
  // Then, let this state receive concurrent bounding box.
  boundingBox?: BoundingBox;
}

export const newMultipleSelectedState = defineIntransientState((option?: Option) => {
  let selectedIdMap: { [id: string]: true };
  let boundingBox: BoundingBox;
  let scode: ShapeSelectionScope | undefined;

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
          return newSelectionHubState;
        }

        scode = firstScope;
      }

      ctx.showFloatMenu();
      ctx.setCommandExams(getCommonCommandExams(ctx));

      if (option?.boundingBox) {
        // Recalculate the bounding because shapes aren't always transformed along with the bounding box.
        // => Also, need to conserve the rotation.
        boundingBox = newBoundingBox({
          path: getRotatedTargetBounds(shapeComposite, selectedIds, option.boundingBox.getRotation()),
        });
      } else {
        const shapeRects = selectedIds.map((id) => shapeMap[id]).map((s) => shapeComposite.getWrapperRect(s));

        boundingBox = newBoundingBox({
          path: geometry.getRectPoints(geometry.getWrapperRect(shapeRects)),
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
                }
              }

              const shapeComposite = ctx.getShapeComposite();
              const shape = findBetterShapeAt(shapeComposite, event.data.point, scode, undefined, ctx.getScale());
              if (!shape) {
                return () => newPointerDownEmptyState(event.data.options);
              }

              if (!event.data.options.ctrl) {
                if (selectedIdMap[shape.id]) {
                  if (event.data.options.alt) {
                    return newDuplicatingShapesState;
                  } else {
                    return () => newMovingHubState({ boundingBox });
                  }
                } else {
                  ctx.selectShape(shape.id, false);
                  if (event.data.options.alt) {
                    return newDuplicatingShapesState;
                  } else {
                    return newSingleSelectedByPointerOnState;
                  }
                }
              }

              ctx.selectShape(shape.id, true);
              return;
            }
            case 1:
              return () => newPointerDownEmptyState(event.data.options);
            case 2: {
              const shapeComposite = ctx.getShapeComposite();
              const shapeAtPointer = findBetterShapeAt(
                shapeComposite,
                event.data.point,
                scode,
                undefined,
                ctx.getScale(),
              );
              if (!shapeAtPointer || selectedIdMap[shapeAtPointer.id]) return;

              ctx.selectShape(shapeAtPointer.id, event.data.options.ctrl);
              return;
            }
            default:
              return;
          }
        case "pointerdoubledown": {
          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.point, scode);
          if (shapeAtPointer && selectedIdMap[shapeAtPointer.id]) {
            return startTextEditingIfPossible(ctx, shapeAtPointer.id, event.data.point);
          }
          return;
        }
        case "pointerhover": {
          const hitResult = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (boundingBox.saveHitResult(hitResult)) {
            ctx.redraw();
          }
          break;
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
      const style = ctx.getStyleScheme();
      const shapeComposite = ctx.getShapeComposite();
      const shapes = Object.entries(shapeComposite.shapeMap)
        .filter(([id]) => selectedIdMap[id])
        .map(([, s]) => s);

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * ctx.getScale() });
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, shapeComposite.getLocalRectPolygon(s), true));
      renderCtx.stroke();

      boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
});
