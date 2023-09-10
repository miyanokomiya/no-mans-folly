import type { AppCanvasState } from "../core";
import { handleHistoryEvent, translateOnSelection } from "../commons";
import { LineShape, getLinePath, patchVertex } from "../../../../shapes/line";
import { add, sub } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { ConnectionResult, LineSnapping, newLineSnapping, renderConnectionResult } from "../../../lineSnapping";
import { ElbowLineHandler, newElbowLineHandler } from "../../../elbowLineHandler";

interface Option {
  lineShape: LineShape;
  index: number;
}

export function newMovingLineVertexState(option: Option): AppCanvasState {
  const origin = getLinePath(option.lineShape)[option.index];
  let vertex = origin;
  let lineSnapping: LineSnapping;
  let connectionResult: ConnectionResult | undefined;
  let elbowHandler: ElbowLineHandler | undefined;

  return {
    getLabel: () => "MovingLineVertex",
    onStart: async (ctx) => {
      ctx.startDragging();

      const shapeMap = ctx.getShapeMap();
      const selectedIds = ctx.getSelectedShapeIdMap();
      lineSnapping = newLineSnapping({
        movingLine: option.lineShape,
        movingIndex: option.index,
        snappableShapes: Object.values(shapeMap).filter((s) => !selectedIds[s.id]),
        getShapeStruct: ctx.getShapeStruct,
      });

      elbowHandler = option.lineShape.lineType === "elbow" ? newElbowLineHandler(ctx) : undefined;
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const point = event.data.current;
          connectionResult = lineSnapping.testConnection(point, ctx.getScale());
          vertex = connectionResult?.p ?? add(origin, sub(point, event.data.start));
          const patch = patchVertex(option.lineShape, option.index, vertex, connectionResult?.connection);

          if (elbowHandler) {
            const body = elbowHandler.optimizeElbow({ ...option.lineShape, ...patch });
            ctx.setTmpShapeMap({ [option.lineShape.id]: { ...patch, body } as Partial<LineShape> });
          } else {
            ctx.setTmpShapeMap({ [option.lineShape.id]: patch });
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
