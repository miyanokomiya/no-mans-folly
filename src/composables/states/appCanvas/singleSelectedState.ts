import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { getLocalRectPolygon } from "../../../shapes";
import { handleCommonShortcut, handleHistoryEvent, handleStateEvent, translateOnSelection } from "./commons";
import { newMovingShapeState } from "./movingShapeState";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newRotatingState } from "./rotatingState";
import { newResizingState } from "./resizingState";
import { newRectangleSelectingState } from "./ractangleSelectingState";

interface Option {
  boundingBox?: BoundingBox;
}

export function newSingleSelectedState(option?: Option): AppCanvasState {
  let selectedId: string | undefined;
  let boundingBox: BoundingBox;

  return {
    getLabel: () => "SingleSelected",
    onStart: async (ctx) => {
      selectedId = ctx.getLastSelectedShapeId();
      const shape = ctx.getShapeMap()[selectedId ?? ""];
      if (!shape) return;

      boundingBox =
        option?.boundingBox ??
        newBoundingBox({
          path: getLocalRectPolygon(ctx.getShapeStruct, shape),
          styleScheme: ctx.getStyleScheme(),
          scale: ctx.getScale(),
        });
    },
    handleEvent: async (ctx, event) => {
      if (!selectedId) return translateOnSelection(ctx);

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
                if (shape.id === selectedId) {
                  return () => newMovingShapeState({ boundingBox });
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
              ctx.deleteShapes([selectedId]);
              return;
            default:
              return handleCommonShortcut(ctx, event);
          }
        case "wheel":
          boundingBox.updateScale(ctx.zoomView(event.data.delta.y));
          return;
        case "selection": {
          return translateOnSelection(ctx);
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newSingleSelectedState;
        case "state":
          return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady"]);
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const shape = ctx.getShapeMap()[selectedId ?? ""];
      if (!shape) return;

      boundingBox.render(renderCtx);
    },
  };
}
