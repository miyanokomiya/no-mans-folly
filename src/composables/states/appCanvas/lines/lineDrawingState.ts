import type { AppCanvasState } from "../core";
import { newDefaultState } from "../defaultState";
import { filterShapesOverlappingRect, getSnappingLines, renderShape } from "../../../../shapes";
import { LineShape, isLineShape, patchVertex } from "../../../../shapes/line";
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
import { COMMAND_EXAM_SRC } from "../commandExams";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { add } from "okageo";
import { TAU } from "../../../../utils/geometry";

interface Option {
  shape: LineShape;
}

export function newLineDrawingState(option: Option): AppCanvasState {
  let shape = option.shape;
  let vertex = option.shape.p;
  let lineSnapping: LineSnapping;
  let connectionResult: ConnectionResult | undefined;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let elbowHandler: ElbowLineHandler | undefined;

  return {
    getLabel: () => "LineDrawing",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);

      const shapeMap = ctx.getShapeMap();
      const snappableShapes = filterShapesOverlappingRect(
        ctx.getShapeStruct,
        Object.values(shapeMap).filter((s) => !isLineShape(s)),
        ctx.getViewRect()
      );
      lineSnapping = newLineSnapping({
        snappableShapes,
        getShapeStruct: ctx.getShapeStruct,
        movingLine: shape,
        movingIndex: 1,
      });

      const snappableLines = [
        ...filterShapesOverlappingRect(
          ctx.getShapeStruct,
          Object.values(shapeMap).filter((s) => isLineShape(s)),
          ctx.getViewRect()
        ),
        shape,
      ];
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableLines.map((s) => [s.id, getSnappingLines(ctx.getShapeStruct, s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      elbowHandler = option.shape.lineType === "elbow" ? newElbowLineHandler(ctx) : undefined;
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const point = event.data.current;
          connectionResult = event.data.ctrl ? undefined : lineSnapping.testConnection(point, ctx.getScale());

          if (connectionResult?.connection) {
            vertex = connectionResult?.p ?? point;
            snappingResult = undefined;
          } else {
            snappingResult = event.data.ctrl ? undefined : shapeSnapping.testPoint(point);
            vertex = snappingResult ? add(point, snappingResult.diff) : point;
            connectionResult = undefined;
          }

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
      renderCtx.ellipse(vertex.x, vertex.y, vertexSize, vertexSize, 0, 0, TAU);
      renderCtx.fill();

      if (connectionResult) {
        renderConnectionResult(renderCtx, {
          result: connectionResult,
          scale: ctx.getScale(),
          style: ctx.getStyleScheme(),
        });
      }

      if (snappingResult) {
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
        });
      }
    },
  };
}
