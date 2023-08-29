import type { AppCanvasState } from "../core";
import { newDefaultState } from "../defaultState";
import { renderShape } from "../../../../shapes";
import { LineShape } from "../../../../shapes/line";
import { newLineSelectedState } from "./lineSelectedState";
import { translateOnSelection } from "../commons";

interface Option {
  shape: LineShape;
}

export function newLineDrawingState(option: Option): AppCanvasState {
  const shape = option.shape;
  let q = option.shape.p;

  return {
    getLabel: () => "LineDrawing",
    onStart: async (ctx) => {
      ctx.startDragging();
      ctx.setCursor("crosshair");
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
      ctx.setCursor();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove":
          q = event.data.current;
          ctx.setTmpShapeMap({});
          return;
        case "pointerup":
          if (!q) return;
          ctx.addShapes([{ ...shape, q } as LineShape]);
          ctx.selectShape(shape.id);
          return newLineSelectedState;
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return translateOnSelection(ctx);
            default:
              return;
          }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        case "history":
          return newDefaultState;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      if (!q) return;
      renderShape(ctx.getShapeStruct, renderCtx, { ...shape, q });
    },
  };
}
