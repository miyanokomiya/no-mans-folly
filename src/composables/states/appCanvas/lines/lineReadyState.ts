import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import { handleStateEvent, translateOnSelection } from "../commons";
import { newDefaultState } from "../defaultState";
import { newLineDrawingState } from "./lineDrawingState";
import { createShape } from "../../../../shapes";
import { LineShape } from "../../../../shapes/line";
import { ConnectionResult, LineSnapping, newLineSnapping, renderConnectionResult } from "../../../lineSnapping";
import { IVec2 } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";

interface Option {
  type: string;
}

export function newLineReadyState(option: Option): AppCanvasState {
  let vertex: IVec2 | undefined;
  let lineSnapping: LineSnapping;
  let connectionResult: ConnectionResult | undefined;

  return {
    getLabel: () => "LineReady",
    onStart: async (ctx) => {
      ctx.setCursor();
      const shapeMap = ctx.getShapeMap();
      lineSnapping = newLineSnapping({
        snappableShapes: Object.values(shapeMap),
        getShapeStruct: ctx.getShapeStruct,
      });
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const point = event.data.point;
              connectionResult = lineSnapping.testConnection(point, ctx.getScale());
              vertex = connectionResult?.p ?? point;

              const lineshape = createShape<LineShape>(ctx.getShapeStruct, "line", {
                id: ctx.generateUuid(),
                p: vertex,
                q: vertex,
                findex: ctx.createLastIndex(),
                lineType: option.type === "elbow" ? "elbow" : undefined,
                pConnection: connectionResult?.connection,
              });
              return () => newLineDrawingState({ shape: lineshape });
            }
            case 1:
              return newPanningState;
            default:
              return;
          }
        case "pointerhover": {
          const point = event.data.current;
          connectionResult = lineSnapping.testConnection(point, ctx.getScale());
          vertex = connectionResult?.p ?? point;
          ctx.setTmpShapeMap({});
          return;
        }
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
        case "state":
          return handleStateEvent(ctx, event, ["Break", "DroppingNewShape", "LineReady"]);
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      if (!vertex) return;

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
