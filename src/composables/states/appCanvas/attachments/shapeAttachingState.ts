import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { getCommonAcceptableEvents, getSnappableCandidates, handleStateEvent } from "../commons";
import { isLineShape } from "../../../../shapes/line";
import { handleCommonWheel } from "../../commons";
import { findBackward, mapReduce, toMap } from "../../../../utils/commons";
import { applyPath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { Shape } from "../../../../models";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { IVec2 } from "okageo";
import { TAU } from "../../../../utils/geometry";

interface Option {
  targetIds: string[];
}

export function newShapeAttachingState(option: Option): AppCanvasState {
  let snappableIdSet = new Set<string>();
  let candidateId: string | undefined;
  let point: IVec2 | undefined;

  function getTargets(ctx: AppCanvasStateContext): Shape[] {
    const shapeComposite = ctx.getShapeComposite();
    return option.targetIds.map((id) => shapeComposite.shapeMap[id]).filter((s) => !!s && shapeComposite.canAttach(s));
  }

  return {
    getLabel: () => "ShapeAttaching",
    onStart: (ctx) => {
      if (getTargets(ctx).length === 0) return ctx.states.newSelectionHubState;

      ctx.setCommandExams([COMMAND_EXAM_SRC.ATTACH_LINE_VERTEX]);
      const snappableCandidates = getSnappableCandidates(ctx, option.targetIds).filter((s) => !isLineShape(s));
      snappableIdSet = new Set(snappableCandidates.map((s) => s.id));
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
              const candidate = candidateId ? shapeComposite.shapeMap[candidateId] : undefined;
              if (!candidate) return ctx.states.newSelectionHubState;

              const to = point ? shapeComposite.getLocationRateOnShape(candidate, point) : { x: 0.5, y: 0.5 };
              const anchor = { x: 0.5, y: 0.5 };
              ctx.patchShapes(
                mapReduce(toMap(getTargets(ctx)), () => ({
                  attachment: {
                    id: candidate.id,
                    to,
                    anchor,
                    rotationType: "relative",
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
          const shapeComposite = ctx.getShapeComposite();
          const candidate = findBackward(shapeComposite.shapes, (s) => {
            if (!snappableIdSet.has(s.id)) return false;
            return shapeComposite.isPointOn(s, p);
          });
          candidateId = candidate?.id;
          point = p;
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

      const shapeComposite = ctx.getShapeComposite();
      const candidate = candidateId ? shapeComposite.shapeMap[candidateId] : undefined;
      if (candidate) {
        const path = shapeComposite.getLocalRectPolygon(candidate);
        renderCtx.beginPath();
        applyPath(renderCtx, path, true);
        scaleGlobalAlpha(renderCtx, 0.1, () => {
          applyFillStyle(renderCtx, {
            color: style.selectionPrimary,
          });
          renderCtx.fill();
        });
        applyStrokeStyle(renderCtx, {
          color: style.selectionPrimary,
          width: 3 * scale,
          dash: "short",
        });
        renderCtx.stroke();

        if (point) {
          applyFillStyle(renderCtx, {
            color: style.selectionSecondaly,
          });
          renderCtx.beginPath();
          renderCtx.arc(point.x, point.y, 8 * scale, 0, TAU);
          renderCtx.fill();
        }
      }
    },
  };
}
