import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { Shape } from "../../../models";
import { getWrapperRect, renderShape } from "../../../shapes";
import { newSingleSelectedState } from "./singleSelectedState";
import { IVec2, getRectCenter, sub } from "okageo";

interface Option {
  shape: Shape;
}

export function newDroppingNewShapeState(option: Option): AppCanvasState {
  const shape = option.shape;
  let p: IVec2 | undefined;

  return {
    getLabel: () => "DroppingNewShape",
    onStart: async (ctx) => {
      ctx.startDragging();
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const rect = getWrapperRect(ctx.getShapeStruct, shape);
          p = sub(event.data.current, getRectCenter(rect));
          ctx.setTmpShapeMap({});
          return;
        }
        case "pointerup":
          if (!p) return translateOnSelection(ctx);

          ctx.addShapes([{ ...shape, p }]);
          ctx.selectShape(shape.id);
          return newSingleSelectedState;
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      if (!p) return;
      renderShape(ctx.getShapeStruct, renderCtx, { ...shape, p });
    },
  };
}
