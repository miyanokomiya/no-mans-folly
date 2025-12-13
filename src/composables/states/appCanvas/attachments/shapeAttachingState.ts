import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { getCommonAcceptableEvents, getSnappableCandidates, handleStateEvent } from "../commons";
import { handleCommonWheel } from "../../commons";
import { findBackward, mapReduce, toMap } from "../../../../utils/commons";
import { Shape } from "../../../../models";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newCacheWithArg } from "../../../../utils/stateful/cache";
import { ConnectionResult, newLineSnapping, renderConnectionResult } from "../../../lineSnapping";
import { getLocationFromRateOnRectPath, TAU } from "../../../../utils/geometry";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { applyPath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { IVec2 } from "okageo";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";

interface Option {
  targetIds: string[];
}

export function newShapeAttachingState(option: Option): AppCanvasState {
  const defaultAnchor = { x: 0.5, y: 0.5 };
  let snappingResult: ConnectionResult | undefined;

  const lineSnappingCache = newCacheWithArg((ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    const snappableCandidates = getSnappableCandidates(ctx, option.targetIds).filter((s) =>
      shapeComposite.canBeShapeAttached(s),
    );
    return newLineSnapping({
      snappableShapes: snappableCandidates,
      getShapeStruct: ctx.getShapeStruct,
    });
  });

  function getTargets(ctx: AppCanvasStateContext): Shape[] {
    const shapeComposite = ctx.getShapeComposite();
    return option.targetIds.map((id) => shapeComposite.shapeMap[id]).filter((s) => !!s && shapeComposite.canAttach(s));
  }

  return {
    getLabel: () => "ShapeAttaching",
    onStart: (ctx) => {
      if (getTargets(ctx).length === 0) return ctx.states.newSelectionHubState;

      ctx.setCommandExams([COMMAND_EXAM_SRC.ATTACH_LINE_VERTEX]);
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              if (!snappingResult?.connection) return ctx.states.newSelectionHubState;

              const shapeComposite = ctx.getShapeComposite();
              const candidate = shapeComposite.shapeMap[snappingResult.connection.id];
              if (!candidate) return ctx.states.newSelectionHubState;

              const to = shapeComposite.getLocationRateOnShape(candidate, snappingResult.p);
              ctx.patchShapes(
                mapReduce(toMap(getTargets(ctx)), () => ({
                  attachment: {
                    id: candidate.id,
                    to,
                    anchor: defaultAnchor,
                    rotationType: "absolute",
                    rotation: 0,
                  },
                })),
              );

              return ctx.states.newSelectionHubState;
            }
            case 1:
              return { type: "stack-resume", getState: () => ctx.states.newPointerDownEmptyState(event.data.options) };
            default:
              return ctx.states.newSelectionHubState;
          }
        case "pointerhover": {
          const p = event.data.current;
          const result = lineSnappingCache.getValue(ctx).testConnection(p, ctx.getScale());

          if (result?.connection) {
            snappingResult = result;
          } else {
            snappingResult = undefined;
            const shapeComposite = ctx.getShapeComposite();
            const candidate = findBackward(lineSnappingCache.getValue(ctx).snappableShapes, (s) => {
              return shapeComposite.isPointOn(s, p);
            });
            if (candidate) {
              snappingResult = {
                connection: {
                  id: candidate.id,
                  rate: shapeComposite.getLocationRateOnShape(candidate, p),
                },
                p,
                outlineSrc: candidate.id,
              };
            }
          }
          ctx.redraw();
          return;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          if (getTargets(ctx).length === 0) return ctx.states.newSelectionHubState;
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
      const shapeComposite = ctx.getShapeComposite();
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const anchors: IVec2[] = [];

      renderCtx.beginPath();
      scaleGlobalAlpha(renderCtx, 0.1, () => {
        applyFillStyle(renderCtx, {
          color: style.selectionPrimary,
        });
        getTargets(ctx).forEach((s) => {
          const rectPath = shapeComposite.getLocalRectPolygon(s);
          const anchorP = getLocationFromRateOnRectPath(rectPath, s.rotation, s.attachment?.anchor ?? defaultAnchor);
          applyPath(renderCtx, rectPath, true);
          anchors.push(anchorP);
        });
        renderCtx.fill();
      });
      applyStrokeStyle(renderCtx, {
        color: style.selectionPrimary,
        width: 3 * scale,
        dash: "short",
      });
      renderCtx.stroke();

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      anchors.forEach((p) => {
        renderCtx.beginPath();
        renderCtx.arc(p.x, p.y, 6 * scale, 0, TAU);
        renderCtx.fill();
      });

      if (!snappingResult?.connection) return;

      const candidate = shapeComposite.shapeMap[snappingResult.connection.id];
      if (!candidate) return;

      applyStrokeStyle(renderCtx, {
        color: style.selectionPrimary,
        width: 3 * scale,
        dash: "dot",
      });
      renderCtx.beginPath();
      anchors.forEach((p) => {
        renderCtx.moveTo(p.x, p.y);
        renderCtx.lineTo(snappingResult!.p.x, snappingResult!.p.y);
      });
      renderCtx.stroke();
      renderConnectionResult(renderCtx, {
        result: snappingResult,
        scale,
        style,
        shapeComposite,
      });
    },
  };
}
