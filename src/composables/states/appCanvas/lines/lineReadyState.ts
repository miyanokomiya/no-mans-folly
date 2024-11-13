import type { AppCanvasState } from "../core";
import { getCommonAcceptableEvents, getSnappableCandidates, handleStateEvent } from "../commons";
import { newDefaultState } from "../defaultState";
import { newLineDrawingState } from "./lineDrawingState";
import { createShape } from "../../../../shapes";
import { CurveType, LineShape, LineType } from "../../../../shapes/line";
import {
  ConnectionResult,
  LineSnapping,
  isLineSnappableShape,
  newLineSnapping,
  renderConnectionResult,
} from "../../../lineSnapping";
import { IVec2, add } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { TAU } from "../../../../utils/geometry";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";
import { newCoordinateRenderer } from "../../../coordinateRenderer";
import { handleCommonWheel } from "../../commons";

interface Option {
  type: LineType;
  curveType?: CurveType;
}

export function newLineReadyState(option: Option): AppCanvasState {
  let vertex: IVec2 | undefined;
  let lineSnapping: LineSnapping;
  let connectionResult: ConnectionResult | undefined;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  const coordinateRenderer = newCoordinateRenderer();

  return {
    getLabel: () => "LineReady",
    onStart: (ctx) => {
      ctx.setCursor();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);

      const shapeComposite = ctx.getShapeComposite();
      const snappableCandidates = getSnappableCandidates(ctx, []);

      const snappableShapes = snappableCandidates.filter((s) => isLineSnappableShape(shapeComposite, s));
      lineSnapping = newLineSnapping({
        snappableShapes,
        getShapeStruct: ctx.getShapeStruct,
        movingIndex: 0,
      });

      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      vertex = ctx.getCursorPoint();
      coordinateRenderer.saveCoord(vertex);
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const point = event.data.point;
              connectionResult = event.data.options.ctrl
                ? undefined
                : lineSnapping.testConnection(point, ctx.getScale());

              if (connectionResult) {
                vertex = connectionResult?.p ?? point;
                snappingResult = undefined;

                if (!connectionResult.connection && connectionResult.guidLines?.length === 1) {
                  snappingResult = shapeSnapping.testPointOnLine(vertex, connectionResult.guidLines[0]);
                  vertex = snappingResult ? add(vertex, snappingResult.diff) : vertex;
                }
              } else {
                snappingResult = event.data.options.ctrl ? undefined : shapeSnapping.testPoint(point);
                vertex = snappingResult ? add(point, snappingResult.diff) : point;
              }

              const lineshape = createShape<LineShape>(ctx.getShapeStruct, "line", {
                id: ctx.generateUuid(),
                p: vertex,
                q: vertex,
                findex: ctx.createLastIndex(),
                lineType: option.type,
                curveType: option.curveType,
                pConnection: connectionResult?.connection,
              });
              return () => newLineDrawingState({ shape: lineshape });
            }
            case 1:
              return () => newPointerDownEmptyState(event.data.options);
            default:
              return;
          }
        case "pointerhover": {
          const point = event.data.current;
          connectionResult = event.data.ctrl ? undefined : lineSnapping.testConnection(point, ctx.getScale());

          if (connectionResult) {
            vertex = connectionResult?.p ?? point;
            snappingResult = undefined;
          } else {
            snappingResult = event.data.ctrl ? undefined : shapeSnapping.testPoint(point);
            vertex = snappingResult ? add(point, snappingResult.diff) : point;
          }

          coordinateRenderer.saveCoord(vertex);
          ctx.redraw();
          return;
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
        case "state":
          return handleStateEvent(ctx, event, getCommonAcceptableEvents());
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      if (!vertex) return;

      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;

      coordinateRenderer.render(renderCtx, ctx.getViewRect(), scale);

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
        const shapeComposite = ctx.getShapeComposite();
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeComposite.shapeMap[id]),
        });
      }
    },
  };
}
