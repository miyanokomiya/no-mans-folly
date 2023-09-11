import { IRectangle, getOuterRectangle } from "okageo";
import type { AppCanvasState } from "./core";
import { getLocalRectPolygon, getWrapperRect } from "../../../shapes";
import { newRectInRectHitTest } from "../../shapeHitTest";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { translateOnSelection } from "./commons";
import { applyPath } from "../../../utils/renderer";

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
          targetIdSet = new Set(
            Object.entries(ctx.getShapeMap())
              .map<[string, IRectangle]>(([id, shape]) => [id, getWrapperRect(ctx.getShapeStruct, shape)])
              .filter(([, rect]) => hitTest.test(rect))
              .map(([id]) => id)
          );
          ctx.setTmpShapeMap({});
          return;
        }
        case "pointerup":
          if (rectangle && targetIdSet.size > 0) {
            ctx.multiSelectShapes(Array.from(targetIdSet), keepSelection);
          }
          return translateOnSelection(ctx);
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const selectedIds = ctx.getSelectedShapeIdMap();
      const shapes = Object.entries(ctx.getShapeMap())
        .filter(([id]) => selectedIds[id] || targetIdSet.has(id))
        .map(([, s]) => s);

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 3 });
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, getLocalRectPolygon(ctx.getShapeStruct, s), true));
      renderCtx.stroke();

      if (!rectangle) return;
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    },
  };
}
