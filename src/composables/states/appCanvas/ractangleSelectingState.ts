import { IRectangle, getOuterRectangle } from "okageo";
import type { AppCanvasState } from "./core";
import { newRectInRectHitTest } from "../../shapeHitTest";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { applyPath } from "../../../utils/renderer";
import { newSelectionHubState } from "./selectionHubState";
import { isTransparentSelection } from "../../../shapes";

interface Option {
  keepSelection?: boolean;
}

export function newRectangleSelectingState(option?: Option): AppCanvasState {
  const keepSelection = option?.keepSelection ?? false;
  let rectangle: IRectangle;
  let targetIdSet = new Set<string>();
  let selectionScope: string | undefined;
  let hasInitialSelectionScope: boolean;

  return {
    getLabel: () => "RectangleSelecting",
    onStart: (ctx) => {
      ctx.startDragging();
      if (!keepSelection) {
        ctx.clearAllSelected();
      }
      const lastSelectedId = ctx.getLastSelectedShapeId();
      if (lastSelectedId) {
        selectionScope = ctx.getShapeComposite().shapeMap[lastSelectedId].parentId;
      }
      hasInitialSelectionScope = !!selectionScope;
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          rectangle = getOuterRectangle([[event.data.start, event.data.current]]);
          const hitTest = newRectInRectHitTest(rectangle);
          const composite = ctx.getShapeComposite();
          const shapeMap = composite.mergedShapeMap;

          const candidateIds = selectionScope
            ? composite.mergedShapeTreeMap[selectionScope].children.map((t) => t.id)
            : composite.mergedShapeTree.flatMap((t) => {
                const shape = shapeMap[t.id];
                if (isTransparentSelection(composite.getShapeStruct, shape)) {
                  return [t.id, ...t.children.map((c) => c.id)];
                } else {
                  return [t.id];
                }
              });

          targetIdSet = new Set(
            candidateIds
              .map<[string, IRectangle]>((id) => [id, composite.getWrapperRect(shapeMap[id])])
              .filter(([, rect]) => hitTest.test(rect))
              .map(([id]) => id),
          );

          if (targetIdSet.size === 0) {
            // Get rid of the scope if this state originally had no scope.
            if (!hasInitialSelectionScope) {
              selectionScope = undefined;
            }
          } else {
            // Pick a scope if any selected shape has a parent.
            const hasParentId = Array.from(targetIdSet.values()).find((id) => shapeMap[id].parentId);
            selectionScope = hasParentId ? shapeMap[hasParentId].parentId : undefined;
          }

          if (selectionScope) {
            // When the scope exists, the parent shouldn't be selected.
            targetIdSet.delete(selectionScope);
          }

          ctx.redraw();
          return;
        }
        case "pointerup":
          if (rectangle && targetIdSet.size > 0) {
            ctx.multiSelectShapes(Array.from(targetIdSet), keepSelection);
          }
          return newSelectionHubState;
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const composite = ctx.getShapeComposite();
      const selectedIds = ctx.getSelectedShapeIdMap();
      const shapes = Object.entries(composite.mergedShapeMap)
        .filter(([id]) => selectedIds[id] || targetIdSet.has(id))
        .map(([, s]) => s);

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 3 });
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, composite.getLocalRectPolygon(s), true));
      renderCtx.stroke();

      if (!rectangle) return;
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    },
  };
}
