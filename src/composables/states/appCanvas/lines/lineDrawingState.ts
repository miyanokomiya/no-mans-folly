import type { AppCanvasState } from "../core";
import { newDefaultState } from "../defaultState";
import { renderShape } from "../../../../shapes";
import { LineShape, patchVertex } from "../../../../shapes/line";
import { newLineSelectedState } from "./lineSelectedState";
import { translateOnSelection } from "../commons";
import { ConnectionResult, LineSnapping, newLineSnapping, renderConnectionResult } from "../../../lineSnapping";
import { ElbowLineHandler, newElbowLineHandler } from "../../../elbowLineHandler";
import { applyFillStyle } from "../../../../utils/fillStyle";

interface Option {
  shape: LineShape;
}

export function newLineDrawingState(option: Option): AppCanvasState {
  let shape = option.shape;
  let vertex = option.shape.p;
  let lineSnapping: LineSnapping;
  let connectionResult: ConnectionResult | undefined;
  let elbowHandler: ElbowLineHandler | undefined;

  return {
    getLabel: () => "LineDrawing",
    onStart: async (ctx) => {
      ctx.startDragging();

      const shapeMap = ctx.getShapeMap();
      const selectedIds = ctx.getSelectedShapeIdMap();
      lineSnapping = newLineSnapping({
        snappableShapes: Object.values(shapeMap).filter((s) => !selectedIds[s.id]),
        getShapeStruct: ctx.getShapeStruct,
      });

      elbowHandler = option.shape.lineType === "elbow" ? newElbowLineHandler(ctx) : undefined;
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const point = event.data.current;
          connectionResult = lineSnapping.testConnection(point, ctx.getScale());
          vertex = connectionResult?.p ?? point;
          const patch = patchVertex(option.shape, 1, vertex, connectionResult?.connection);

          if (elbowHandler) {
            const body = elbowHandler.optimizeElbow({ ...option.shape, ...patch });
            shape = { ...option.shape, ...patch, body };
          } else {
            shape = { ...option.shape, ...patch };
          }

          ctx.setTmpShapeMap({});
          return;
        }
        case "pointerup":
          if (!vertex) return;
          ctx.addShapes([shape]);
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
      if (!vertex) return;

      renderShape(ctx.getShapeStruct, renderCtx, shape);

      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;
      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.ellipse(vertex.x, vertex.y, vertexSize, vertexSize, 0, 0, Math.PI * 2);
      renderCtx.fill();

      if (connectionResult) {
        renderConnectionResult(renderCtx, {
          result: connectionResult,
          scale: ctx.getScale(),
          style: ctx.getStyleScheme(),
        });
      }
    },
  };
}
