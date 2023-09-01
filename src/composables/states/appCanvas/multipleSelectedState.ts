import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { getLocalRectPolygon, getWrapperRect } from "../../../shapes";
import {
  handleCommonShortcut,
  handleCommonTextStyle,
  handleHistoryEvent,
  handleStateEvent,
  startTextEditingIfPossible,
  translateOnSelection,
} from "./commons";
import * as geometry from "../../../utils/geometry";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { applyPath } from "../../../utils/renderer";
import { newMovingShapeState } from "./movingShapeState";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newResizingState } from "./resizingState";
import { newRotatingState } from "./rotatingState";
import { newRectangleSelectingState } from "./ractangleSelectingState";

interface Option {
  boundingBox?: BoundingBox;
}

export function newMultipleSelectedState(option?: Option): AppCanvasState {
  let selectedIds: { [id: string]: true };
  let boundingBox: BoundingBox;
  let timestamp = 0;

  return {
    getLabel: () => "MultipleSelected",
    onStart: async (ctx) => {
      selectedIds = ctx.getSelectedShapeIdMap();
      const shapeMap = ctx.getShapeMap();

      ctx.showFloatMenu();

      if (option?.boundingBox) {
        boundingBox = option.boundingBox;
      } else {
        const shapeRects = Object.keys(selectedIds)
          .map((id) => shapeMap[id])
          .map((s) => getWrapperRect(ctx.getShapeStruct, s));

        boundingBox = newBoundingBox({
          path: geometry.getRectPoints(geometry.getWrapperRect(shapeRects)),
          styleScheme: ctx.getStyleScheme(),
          scale: ctx.getScale(),
        });
      }

      timestamp = ctx.getTimestamp();
    },
    onEnd: async (ctx) => {
      ctx.hideFloatMenu();
    },
    handleEvent: async (ctx, event) => {
      if (!selectedIds) return;

      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
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

              const shape = ctx.getShapeAt(event.data.point);
              if (!shape) {
                return () => newRectangleSelectingState({ keepSelection: event.data.options.ctrl });
              }

              if (!event.data.options.ctrl) {
                if (selectedIds[shape.id]) {
                  if (ctx.getTimestamp() - timestamp < 300) {
                    return startTextEditingIfPossible(ctx, shape.id);
                  } else {
                    return () => newMovingShapeState({ boundingBox });
                  }
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
          if (hitBounding) {
            const style = boundingBox.getCursorStyle(hitBounding);
            if (style) {
              ctx.setCursor(style);
              return;
            }
          }

          const shape = ctx.getShapeAt(event.data.current);
          ctx.setCursor(shape ? "pointer" : undefined);
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes(Object.keys(selectedIds));
              return;
            default:
              return handleCommonShortcut(ctx, event);
          }
        case "text-style": {
          return handleCommonTextStyle(ctx, event);
        }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          boundingBox.updateScale(ctx.getScale());
          return;
        case "selection": {
          return translateOnSelection(ctx);
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newMultipleSelectedState;
        case "state":
          return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady"]);
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const shapes = Object.entries(ctx.getShapeMap())
        .filter(([id]) => selectedIds[id])
        .map(([, s]) => s);

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 });
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, getLocalRectPolygon(ctx.getShapeStruct, s), true));
      renderCtx.stroke();

      boundingBox.render(renderCtx);
    },
  };
}
