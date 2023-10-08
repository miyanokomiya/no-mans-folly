import { IRectangle, getOuterRectangle } from "okageo";
import type { AppCanvasState } from "./core";
import { newRectInRectHitTest } from "../../shapeHitTest";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { applyPath } from "../../../utils/renderer";
import { newSelectionHubState } from "./selectionHubState";

interface Option {
  keepSelection?: boolean;
}

export function newRectangleSelectingState(option?: Option): AppCanvasState {
  const keepSelection = option?.keepSelection ?? false;
  let rectangle: IRectangle;
  let targetIdSet = new Set<string>();

  return {
    getLabel: () => "RectangleSelecting",
    onStart: (ctx) => {
      ctx.startDragging();
      if (!keepSelection) {
        ctx.clearAllSelected();
      }
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
          targetIdSet = new Set(
            composite.mergedShapeTree
              .map<[string, IRectangle]>((treeNode) => [treeNode.id, composite.getWrapperRect(shapeMap[treeNode.id])])
              .filter(([, rect]) => hitTest.test(rect))
              .map(([id]) => id),
          );
          ctx.setTmpShapeMap({});
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
