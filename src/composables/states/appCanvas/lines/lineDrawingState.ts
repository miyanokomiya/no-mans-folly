import type { AppCanvasState } from "../core";
import { newDefaultState } from "../defaultState";
import { renderShape } from "../../../../shapes";
import { LineShape, patchVertex } from "../../../../shapes/line";
import { newLineSelectedState } from "./lineSelectedState";
import {
  ConnectionResult,
  LineSnapping,
  newLineSnapping,
  optimizeLinePath,
  renderConnectionResult,
} from "../../../lineSnapping";
import { ElbowLineHandler, newElbowLineHandler } from "../../../elbowLineHandler";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { newSelectionHubState } from "../selectionHubState";

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
    onStart: (ctx) => {
      ctx.startDragging();

      const shapeMap = ctx.getShapeMap();
      const selectedIds = ctx.getSelectedShapeIdMap();
      lineSnapping = newLineSnapping({
        snappableShapes: Object.values(shapeMap).filter((s) => !selectedIds[s.id]),
        getShapeStruct: ctx.getShapeStruct,
        movingLine: shape,
        movingIndex: 1,
      });

      elbowHandler = option.shape.lineType === "elbow" ? newElbowLineHandler(ctx) : undefined;
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const point = event.data.current;
          connectionResult = lineSnapping.testConnection(point, ctx.getScale());
          vertex = connectionResult?.p ?? point;
          let patch = patchVertex(option.shape, 1, vertex, connectionResult?.connection);

          const optimized = optimizeLinePath(ctx, { ...option.shape, ...patch });
          patch = optimized ? { ...patch, ...optimized } : patch;

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
              return newSelectionHubState;
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
