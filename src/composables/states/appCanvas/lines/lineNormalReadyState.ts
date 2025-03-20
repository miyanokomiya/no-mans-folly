import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { getCommonAcceptableEvents, getSnappableCandidates, handleStateEvent } from "../commons";
import { createShape, getTangentAt } from "../../../../shapes";
import { LineShape } from "../../../../shapes/line";
import { ConnectionResult, isLineSnappableShape, newLineSnapping, renderConnectionResult } from "../../../lineSnapping";
import { add, getInner, IVec2, multi, rotate, sub } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newShapeSnapping } from "../../../shapeSnapping";
import { ISegment, TAU } from "../../../../utils/geometry";
import { newCoordinateRenderer } from "../../../coordinateRenderer";
import { handleCommonWheel } from "../../commons";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { applyPath } from "../../../../utils/renderer";
import { newCacheWithArg } from "../../../../utils/stateful/cache";

export function newLineNormalReadyState(): AppCanvasState {
  let vertex: IVec2 | undefined;
  let guideline: ISegment | undefined;
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
    return {
      withGuideline: newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: ctx.getShapeStruct,
        threshold: 60,
      }),
      withoutGuideline: newLineSnapping({
        snappableShapes,
        getShapeStruct: ctx.getShapeStruct,
        threshold: 60,
      }),
    };
  });

  const getConnectionResult = (
    point: IVec2,
    ctrl: boolean | undefined,
    ctx: AppCanvasStateContext,
  ): ConnectionResult | undefined => {
    const snapping = lineSnappingCache.getValue(ctx);
    return (ctrl ? snapping.withoutGuideline : snapping.withGuideline).testConnection(point, ctx.getScale());
  };

  const getGuideline = (slope: number, point: IVec2, vertex: IVec2): ISegment => {
    const v = multi(rotate({ x: 1, y: 0 }, slope + Math.PI / 2), 50);
    if (getInner(sub(point, vertex), v) < 0) {
      return [vertex, sub(vertex, v)];
    } else {
      return [vertex, add(vertex, v)];
    }
  };

  return {
    getLabel: () => "LineNormalReady",
    onStart: (ctx) => {
      ctx.setCursor();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);
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
              const point = event.data.point;
              connectionResult = getConnectionResult(point, event.data.options.ctrl, ctx);
              vertex = connectionResult?.p ?? point;
              if (!connectionResult?.outlineSrc) return ctx.states.newSelectionHubState;

              const shapeComposite = ctx.getShapeComposite();
              const target = shapeComposite.shapeMap[connectionResult.outlineSrc];
              const r = getTangentAt(shapeComposite.getShapeStruct, target, vertex);
              guideline = getGuideline(r, point, vertex);

              const shape = createShape<LineShape>(ctx.getShapeStruct, "line", {
                id: ctx.generateUuid(),
                p: guideline[0],
                q: guideline[1],
                findex: ctx.createLastIndex(),
                pConnection: connectionResult.connection,
              });
              ctx.addShapes([shape]);
              ctx.selectShape(shape.id);
              return ctx.states.newSelectionHubState;
            }
            case 1:
              return { type: "stack-resume", getState: () => ctx.states.newPointerDownEmptyState(event.data.options) };
            default:
              return ctx.states.newSelectionHubState;
          }
        case "pointerhover": {
          const point = event.data.current;
          connectionResult = getConnectionResult(point, event.data.ctrl, ctx);
          vertex = connectionResult?.p ?? point;
          coordinateRenderer.saveCoord(vertex);

          if (connectionResult?.outlineSrc) {
            const shapeComposite = ctx.getShapeComposite();
            const target = shapeComposite.shapeMap[connectionResult.outlineSrc];
            const r = getTangentAt(shapeComposite.getShapeStruct, target, vertex);
            guideline = getGuideline(r, point, vertex);
          } else {
            guideline = undefined;
          }

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
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();

      if (vertex) {
        coordinateRenderer.render(renderCtx, ctx.getViewRect(), scale);

        applyFillStyle(renderCtx, { color: style.selectionPrimary });
        renderCtx.beginPath();
        renderCtx.arc(vertex.x, vertex.y, 8 * scale, 0, TAU);
        renderCtx.fill();
      }

      if (connectionResult) {
        const shapeComposite = ctx.getShapeComposite();
        renderConnectionResult(renderCtx, {
          result: connectionResult,
          scale: ctx.getScale(),
          style: ctx.getStyleScheme(),
          shapeComposite,
        });
      }

      if (guideline) {
        applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 4 * scale });
        renderCtx.beginPath();
        applyPath(renderCtx, guideline);
        renderCtx.stroke();

        applyFillStyle(renderCtx, { color: style.selectionSecondaly });
        renderCtx.beginPath();
        renderCtx.arc(guideline[1].x, guideline[1].y, 6 * scale, 0, TAU);
        renderCtx.fill();
      }
    },
  };
}
