import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { getLocalRectPolygon, getWrapperRect } from "../../../shapes";
import { handleHistoryEvent, handleStateEvent, translateOnSelection } from "./commons";
import * as geometry from "../../../utils/geometry";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { applyPath } from "../../../utils/renderer";
import { newMovingShapeState } from "./movingShapeState";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newMultipleResizingState } from "./multipleResizingState";

export function newMultipleSelectedState(): AppCanvasState {
  let selectedIds: { [id: string]: true };
  let boundingBox: BoundingBox;

  return {
    getLabel: () => "MultipleSelected",
    onStart: async (ctx) => {
      selectedIds = ctx.getSelectedShapeIdMap();
      const shapeMap = ctx.getShapeMap();
      const shapeRects = Object.keys(selectedIds)
        .map((id) => shapeMap[id])
        .map((s) => getWrapperRect(ctx.getShapeStruct, s));

      boundingBox = newBoundingBox({
        path: geometry.getRectPoints(geometry.getWrapperRect(shapeRects)),
        styleScheme: ctx.getStyleScheme(),
      });
    },
    handleEvent: async (ctx, event) => {
      if (!selectedIds) return;

      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const hitResult = boundingBox.hitTest(event.data.point);
              if (hitResult && hitResult.type !== "area") {
                return () => newMultipleResizingState({ boundingBox, hitResult });
              }

              const shape = ctx.getShapeAt(event.data.point);
              if (!shape) {
                ctx.clearAllSelected();
                return;
              }

              if (!event.data.options.ctrl) {
                if (selectedIds[shape.id]) {
                  return newMovingShapeState;
                } else {
                  ctx.selectShape(shape.id, false);
                  return newSingleSelectedByPointerOnState;
                }
              }

              ctx.selectShape(shape.id, true);
              return;
            }
            case 1:
              return { type: "stack-restart", getState: newPanningState };
            default:
              return;
          }
        case "pointerhover": {
          const hitBounding = boundingBox.hitTest(event.data.current);
          if (hitBounding && hitBounding.type !== "area") {
            if (hitBounding.type === "corner") {
              ctx.setCursor(hitBounding.index % 2 === 0 ? "nwse-resize" : "nesw-resize");
            } else if (hitBounding.type === "segment") {
              ctx.setCursor(hitBounding.index % 2 === 0 ? "ns-resize" : "ew-resize");
            }
          } else {
            const shape = ctx.getShapeAt(event.data.current);
            ctx.setCursor(shape ? "pointer" : undefined);
          }
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes(Object.keys(selectedIds));
              return;
            default:
              return;
          }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        case "selection": {
          return translateOnSelection(ctx);
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newMultipleSelectedState;
        case "state":
          return handleStateEvent(event, ["DroppingNewShape"]);
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const shapes = Object.entries(ctx.getShapeMap())
        .filter(([id]) => selectedIds[id])
        .map(([, s]) => s);

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly });
      renderCtx.lineWidth = 1;
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, getLocalRectPolygon(ctx.getShapeStruct, s), true));
      renderCtx.stroke();

      boundingBox.render(renderCtx);
    },
  };
}
