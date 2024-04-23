import type { AppCanvasState } from "../core";
import { newDefaultState } from "../defaultState";
import { LineShape, isLineShape, patchVertex } from "../../../../shapes/line";
import { newLineSelectedState } from "./lineSelectedState";
import {
  ConnectionResult,
  LineSnapping,
  isLineSnappableShape,
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
import { newShapeComposite } from "../../../shapeComposite";
import { handleCommonWheel } from "../commons";
import { getDefaultCurveBody } from "../../../../utils/curveLine";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";

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

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const snappableShapes = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => isLineSnappableShape(shapeComposite, s)),
        ctx.getViewRect(),
      );
      lineSnapping = newLineSnapping({
        snappableShapes,
        getShapeStruct: ctx.getShapeStruct,
        movingLine: shape,
        movingIndex: 1,
      });

      const snappableLines = [
        ...shapeComposite.getShapesOverlappingRect(
          Object.values(shapeMap).filter((s) => isLineShape(s)),
          ctx.getViewRect(),
        ),
        shape,
      ];
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableLines.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
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
            patch = { ...patch, body };
          } else if (option.shape.curveType === "auto") {
            // Append middle vertex to make a curve
            getDefaultCurveBody(shape.p, shape.q);
            patch = { ...patch, body: getDefaultCurveBody(shape.p, shape.q) };
          }

          const tmpShapeComposite = newShapeComposite({
            getStruct: ctx.getShapeComposite().getShapeStruct,
            shapes: [option.shape],
          });
          patch = getPatchAfterLayouts(tmpShapeComposite, { update: { [option.shape.id]: patch } })[option.shape.id];

          shape = { ...option.shape, ...patch };
          ctx.redraw();
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
          handleCommonWheel(ctx, event);
          return;
        case "history":
          return newDefaultState;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      if (!vertex) return;

      const shapeComposite = newShapeComposite({
        shapes: [shape],
        getStruct: ctx.getShapeStruct,
      });
      shapeComposite.render(renderCtx, shape);

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
