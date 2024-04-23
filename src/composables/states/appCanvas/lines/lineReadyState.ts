import type { AppCanvasState } from "../core";
import { getCommonAcceptableEvents, handleCommonWheel, handleStateEvent } from "../commons";
import { newDefaultState } from "../defaultState";
import { newLineDrawingState } from "./lineDrawingState";
import { createShape } from "../../../../shapes";
import { CurveType, LineShape, LineType, isLineShape } from "../../../../shapes/line";
import {
  ConnectionResult,
  LineSnapping,
  isLineSnappableShape,
  newLineSnapping,
  renderConnectionResult,
} from "../../../lineSnapping";
import { IVec2, add } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { newSelectionHubState } from "../selectionHubState";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { TAU } from "../../../../utils/geometry";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";

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

  return {
    getLabel: () => "LineReady",
    onStart: (ctx) => {
      ctx.setCursor();
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
        movingIndex: 0,
      });

      const snappableLines = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => isLineShape(s)),
        ctx.getViewRect(),
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableLines.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      vertex = ctx.getCursorPoint();
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

          ctx.setTmpShapeMap({});
          return;
        }
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
