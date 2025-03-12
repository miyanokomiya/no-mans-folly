import type { AppCanvasState } from "../core";
import { newDefaultState } from "../defaultState";
import { getLinePath, LineShape, patchVertex } from "../../../../shapes/line";
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
  // This state creates "body" for the line, so that the "body" value of this shape does nothing.
  shape: LineShape;
}

export function newLineDrawingState(option: Option): AppCanvasState {
  const srcShape: LineShape = { ...option.shape, body: [] };
  const linePath = getLinePath(srcShape);
  const movingIndex = linePath.length - 1;
  let latestShape = srcShape;
  let vertex = linePath[movingIndex];
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
        movingLine: srcShape,
        movingIndex,
        ignoreCurrentLine: true,
      });

      elbowHandler = srcShape.lineType === "elbow" ? newElbowLineHandler(ctx) : undefined;
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
          let patch = patchVertex(srcShape, movingIndex, vertex, connectionResult?.connection);

          const optimized = optimizeLinePath(ctx, { ...srcShape, ...patch });
          patch = optimized ? { ...patch, ...optimized } : patch;

          if (elbowHandler) {
            const body = elbowHandler.optimizeElbow({ ...srcShape, ...patch });
            patch = { ...patch, body };
          } else if (srcShape.curveType === "auto") {
            // Append middle vertex to make a curve
            patch = { ...patch, body: getDefaultCurveBody(srcShape.p, patch.q ?? latestShape.q) };
          }

          const shapeComposite = ctx.getShapeComposite();

          // Include connected shapes to temporary shape composite.
          // => This is essential for connection layout to work properly.
          const tmpShapeSet: Set<Shape> = new Set([srcShape]);
          if (srcShape.pConnection) {
            tmpShapeSet.add(shapeComposite.shapeMap[srcShape.pConnection.id]);
          }
          if (patch.qConnection) {
            tmpShapeSet.add(shapeComposite.shapeMap[patch.qConnection.id]);
          }

          const tmpShapeComposite = newShapeComposite({
            getStruct: shapeComposite.getShapeStruct,
            shapes: Array.from(tmpShapeSet),
          });
          patch = getPatchAfterLayouts(tmpShapeComposite, { update: { [srcShape.id]: patch } })[srcShape.id];

          latestShape = { ...srcShape, ...patch };
          ctx.redraw();
          return;
        }
        case "pointerup": {
          if (isSame(latestShape.p, latestShape.q)) {
            // When the line has zero length, continue drawing it at first.
            // When it happens again, cancel drawing the line.
            if (!hoverMode) {
              hoverMode = true;
              return;
            } else {
              return ctx.states.newSelectionHubState;
            }
          }

          ctx.addShapes([latestShape]);
          ctx.selectShape(latestShape.id);
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
        shapes: [latestShape],
        getStruct: ctx.getShapeStruct,
      });
      lineShapeComposite.render(renderCtx, latestShape);

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
          shapeComposite,
        });
      }
    },
  };
}
