import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { add, sub } from "okageo";
import { Shape } from "../../../models";

export function newMovingShapeState(): AppCanvasState {
  return {
    getLabel: () => "MovingShape",
    onStart: async (ctx) => {
      ctx.startDragging();
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const d = sub(event.data.current, event.data.start);
          const shapeMap = ctx.getShapeMap();
          ctx.setTmpShapeMap(
            Object.keys(ctx.getSelectedShapeIdMap()).reduce<{ [id: string]: Partial<Shape> }>((m, id) => {
              const s = shapeMap[id];
              if (s) {
                m[id] = { p: add(s.p, d) };
              }
              return m;
            }, {})
          );
          return;
        }
        case "pointerup": {
          const val = ctx.getTmpShapeMap();
          if (Object.keys(val).length > 0) {
            ctx.patchShapes(val);
          }
          return translateOnSelection(ctx);
        }
        case "selection": {
          return translateOnSelection(ctx);
        }
        default:
          return;
      }
    },
  };
}
