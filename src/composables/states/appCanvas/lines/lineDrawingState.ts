import type { AppCanvasState } from "../core";
import { newDefaultState } from "../defaultState";
import { LineShape, patchVertex } from "../../../../shapes/line";
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
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newShapeSnapping } from "../../../shapeSnapping";
import { isSame } from "okageo";
import { TAU } from "../../../../utils/geometry";
import { newShapeComposite } from "../../../shapeComposite";
import { handleCommonWheel } from "../../commons";
import { getDefaultCurveBody } from "../../../../shapes/utils/curveLine";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { newCoordinateRenderer } from "../../../coordinateRenderer";
import { Shape } from "../../../../models";
import { getSnappableCandidates } from "../commons";

interface Option {
  shape: LineShape;
}

export function newLineDrawingState(option: Option): AppCanvasState {
  let shape = option.shape;
  let vertex = option.shape.p;
  let lineSnapping: LineSnapping;
  let connectionResult: ConnectionResult | undefined;
  let elbowHandler: ElbowLineHandler | undefined;
  const coordinateRenderer = newCoordinateRenderer({ coord: vertex });
  let hoverMode = false;

  return {
    getLabel: () => "LineDrawing",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);

      const shapeComposite = ctx.getShapeComposite();
      const snappableCandidates = getSnappableCandidates(ctx, []);

      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        gridSnapping: ctx.getGrid().getSnappingLines(),
        settings: ctx.getUserSetting(),
      });

      const snappableShapes = snappableCandidates.filter((s) => isLineSnappableShape(shapeComposite, s));
      lineSnapping = newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: shapeComposite.getShapeStruct,
        movingLine: shape,
        movingIndex: 1,
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
          vertex = connectionResult?.p ?? point;

          coordinateRenderer.saveCoord(vertex);
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

          const shapeComposite = ctx.getShapeComposite();

          // Include connected shapes to temporary shape composite.
          // => This is essential for connection layout to work properly.
          const tmpShapeSet: Set<Shape> = new Set([option.shape]);
          if (option.shape.pConnection) {
            tmpShapeSet.add(shapeComposite.shapeMap[option.shape.pConnection.id]);
          }
          if (patch.qConnection) {
            tmpShapeSet.add(shapeComposite.shapeMap[patch.qConnection.id]);
          }

          const tmpShapeComposite = newShapeComposite({
            getStruct: shapeComposite.getShapeStruct,
            shapes: Array.from(tmpShapeSet),
          });
          patch = getPatchAfterLayouts(tmpShapeComposite, { update: { [option.shape.id]: patch } })[option.shape.id];

          shape = { ...option.shape, ...patch };
          ctx.redraw();
          return;
        }
        case "pointerup": {
          if (isSame(shape.p, shape.q)) {
            // When the line has zero length, continue drawing it at first.
            // When it happens again, cancel drawing the line.
            if (!hoverMode) {
              hoverMode = true;
              return;
            } else {
              return ctx.states.newSelectionHubState;
            }
          }

          ctx.addShapes([shape]);
          ctx.selectShape(shape.id);
          return ctx.states.newSelectionHubState;
        }
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return ctx.states.newSelectionHubState;
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
      const lineShapeComposite = newShapeComposite({
        shapes: [shape],
        getStruct: ctx.getShapeStruct,
      });
      lineShapeComposite.render(renderCtx, shape);

      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;

      coordinateRenderer.render(renderCtx, ctx.getViewRect(), scale);

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.ellipse(vertex.x, vertex.y, vertexSize, vertexSize, 0, 0, TAU);
      renderCtx.fill();

      const shapeComposite = ctx.getShapeComposite();
      if (connectionResult) {
        renderConnectionResult(renderCtx, {
          result: connectionResult,
          scale: ctx.getScale(),
          style: ctx.getStyleScheme(),
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeComposite.shapeMap[id]),
        });
      }
    },
  };
}
