import type { AppCanvasState } from "../core";
import { handleHistoryEvent, translateOnSelection } from "../commons";
import { LineShape, getLinePath, patchConnection, patchVertex } from "../../../../shapes/line";
import { add, sub } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { getClosestConnection } from "../../../lineSnapping";

interface Option {
  lineShape: LineShape;
  index: number;
}

export function newMovingLineVertexState(option: Option): AppCanvasState {
  const origin = getLinePath(option.lineShape)[option.index];
  let vertex = origin;

  return {
    getLabel: () => "MovingLineVertex",
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
          const point = event.data.current;
          const connectionInfo = getClosestConnection(point, ctx);

          if (connectionInfo) {
            vertex = connectionInfo.p;
            ctx.setTmpShapeMap({
              [option.lineShape.id]: {
                ...patchVertex(option.lineShape, option.index, vertex),
                ...patchConnection(option.lineShape, option.index, connectionInfo.connection),
              },
            });
          } else {
            vertex = add(origin, sub(point, event.data.start));
            ctx.setTmpShapeMap({
              [option.lineShape.id]: { ...patchVertex(option.lineShape, option.index, vertex) },
            });
          }
          return;
        }
        case "pointerup": {
          const tmpMap = ctx.getTmpShapeMap();
          if (Object.keys(tmpMap).length > 0) {
            ctx.patchShapes(tmpMap);
          }
          return translateOnSelection(ctx);
        }
        case "selection": {
          return translateOnSelection(ctx);
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return translateOnSelection(ctx);
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;
      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.ellipse(vertex.x, vertex.y, vertexSize, vertexSize, 0, 0, Math.PI * 2);
      renderCtx.fill();
    },
  };
}
