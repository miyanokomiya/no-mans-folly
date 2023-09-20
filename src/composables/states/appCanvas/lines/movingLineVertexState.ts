import type { AppCanvasState } from "../core";
import { handleHistoryEvent } from "../commons";
import { LineShape, getLinePath, isLineShape, patchVertex } from "../../../../shapes/line";
import { add, sub } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import {
  ConnectionResult,
  LineSnapping,
  newLineSnapping,
  optimizeLinePath,
  renderConnectionResult,
} from "../../../lineSnapping";
import { ElbowLineHandler, newElbowLineHandler } from "../../../elbowLineHandler";
import { filterShapesOverlappingRect } from "../../../../shapes";
import { LineLabelHandler, newLineLabelHandler } from "../../../lineLabelHandler";
import { mergeMap } from "../../../../utils/commons";
import { newSelectionHubState } from "../selectionHubState";

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
  let lineLabelHandler: LineLabelHandler;

  return {
    getLabel: () => "MovingLineVertex",
    onStart: (ctx) => {
      ctx.startDragging();

      const shapeMap = ctx.getShapeMap();
      const selectedIds = ctx.getSelectedShapeIdMap();
      const snappableShapes = filterShapesOverlappingRect(
        ctx.getShapeStruct,
        Object.values(shapeMap).filter((s) => !selectedIds[s.id] && !isLineShape(s)),
        ctx.getViewRect()
      );
      lineSnapping = newLineSnapping({
        movingLine: option.lineShape,
        movingIndex: option.index,
        snappableShapes,
        getShapeStruct: ctx.getShapeStruct,
      });

      elbowHandler = option.lineShape.lineType === "elbow" ? newElbowLineHandler(ctx) : undefined;

      lineLabelHandler = newLineLabelHandler({ ctx });
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const point = event.data.current;
          connectionResult = lineSnapping.testConnection(point, ctx.getScale());
          vertex = connectionResult?.p ?? add(origin, sub(point, event.data.start));
          let patch = patchVertex(option.lineShape, option.index, vertex, connectionResult?.connection);

          const optimized = optimizeLinePath(ctx, { ...option.lineShape, ...patch });
          patch = optimized ? { ...patch, ...optimized } : patch;

          if (elbowHandler) {
            const body = elbowHandler.optimizeElbow({ ...option.lineShape, ...patch });
            patch = { ...patch, body };
          }

          const patchMap = { [option.lineShape.id]: patch };
          const labelPatch = lineLabelHandler.onModified(patchMap);
          ctx.setTmpShapeMap(mergeMap(patchMap, labelPatch));
          return;
        }
        case "pointerup": {
          const tmpMap = ctx.getTmpShapeMap();
          if (Object.keys(tmpMap).length > 0) {
            ctx.patchShapes(tmpMap);
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newSelectionHubState;
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
