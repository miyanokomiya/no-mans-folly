import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { getCommonAcceptableEvents, getSnappableCandidates, handleStateEvent } from "../commons";
import { newLineDrawingState } from "./lineDrawingState";
import { createShape } from "../../../../shapes";
import { CurveType, LineShape, LineType } from "../../../../shapes/line";
import {
  ConnectionResult,
  getConnectionResultByHook,
  isLineSnappableShape,
  newLineSnapping,
  renderConnectionResult,
} from "../../../lineSnapping";
import { getRectCenter, IVec2 } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newShapeSnapping } from "../../../shapeSnapping";
import { TAU } from "../../../../utils/geometry";
import { newCoordinateRenderer } from "../../../coordinateRenderer";
import { handleCommonWheel } from "../../commons";
import { newCacheWithArg } from "../../../../utils/stateful/cache";

interface Option {
  type: LineType;
  curveType?: CurveType;
}

export function newLineReadyState(option: Option): AppCanvasState {
  let vertex: IVec2 | undefined;
  let connectionResult: ConnectionResult | undefined;
  const coordinateRenderer = newCoordinateRenderer();

  const lineSnappingCache = newCacheWithArg((ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    const snappableCandidates = getSnappableCandidates(ctx, []);
    const shapeSnapping = newShapeSnapping({
      shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
      gridSnapping: ctx.getGrid().getSnappingLines(),
      settings: ctx.getUserSetting(),
    });
    const snappableShapes = snappableCandidates.filter((s) => isLineSnappableShape(shapeComposite, s));
    return newLineSnapping({
      snappableShapes,
      shapeSnapping,
      getShapeStruct: ctx.getShapeStruct,
    });
  });

  return {
    getLabel: () => "LineReady",
    onStart: (ctx) => {
      ctx.setCommandExams([
        COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP,
        COMMAND_EXAM_SRC.HOOK_TO_SHAPE,
        COMMAND_EXAM_SRC.TOGGLE_GRID,
      ]);
      vertex = ctx.getCursorPoint();
      coordinateRenderer.saveCoord(vertex);
    },
    onResume: () => {
      lineSnappingCache.update();
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const shapeComposite = ctx.getShapeComposite();
              const point = event.data.point;

              connectionResult = undefined;
              if (event.data.options.shift) {
                connectionResult = getConnectionResultByHook(
                  shapeComposite,
                  lineSnappingCache.getValue(ctx).snappableShapes,
                  point,
                  createShape<LineShape>(shapeComposite.getShapeStruct, "line", { id: "mock" }),
                  0,
                );
              }

              if (!connectionResult) {
                connectionResult =
                  event.data.options.ctrl || event.data.options.shift
                    ? undefined
                    : lineSnappingCache.getValue(ctx).testConnection(point, ctx.getScale());
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
              return { type: "stack-resume", getState: () => ctx.states.newPointerDownEmptyState(event.data.options) };
            default:
              return ctx.states.newSelectionHubState;
          }
        case "pointerhover": {
          const shapeComposite = ctx.getShapeComposite();
          const point = event.data.current;

          connectionResult = undefined;
          if (event.data.shift) {
            connectionResult = getConnectionResultByHook(
              shapeComposite,
              lineSnappingCache.getValue(ctx).snappableShapes,
              point,
              createShape<LineShape>(shapeComposite.getShapeStruct, "line", { id: "mock" }),
              0,
            );
          }

          if (!connectionResult) {
            connectionResult =
              event.data.ctrl || event.data.shift
                ? undefined
                : lineSnappingCache.getValue(ctx).testConnection(point, ctx.getScale());
          } else if (connectionResult.outlineSrc) {
            // Hooked vertex must be at the center of the target.
            const hooked = shapeComposite.shapeMap[connectionResult.outlineSrc];
            const p = getRectCenter(shapeComposite.getWrapperRect(hooked));
            connectionResult = { ...connectionResult, p };
          }

          vertex = connectionResult?.p ?? point;
          coordinateRenderer.saveCoord(vertex);
          ctx.redraw();
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return ctx.states.newSelectionHubState;
            case "g":
              if (event.data.shift) return;
              ctx.patchUserSetting({ grid: ctx.getGrid().disabled ? "on" : "off" });
              lineSnappingCache.update();
              return;
            default:
              return;
          }
        case "wheel":
          handleCommonWheel(ctx, event);
          lineSnappingCache.update();
          return;
        case "history":
          return ctx.states.newSelectionHubState;
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
