import type { AppCanvasState, AppCanvasStateContext } from "./core";
import { getCommonAcceptableEvents, handleStateEvent } from "./commons";
import { handleCommonWheel } from "../commons";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { getRectWithRotationFromRectPolygon, TAU } from "../../../utils/geometry";
import { applyFillStyle } from "../../../utils/fillStyle";
import { applyPath, scaleGlobalAlpha } from "../../../utils/renderer";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { handleShapeUpdate } from "./utils/shapeUpdatedEventHandlers";
import { getMoveToAffine, getRotateToAffine, getScaleToAffine } from "../../inspector";
import { Shape } from "../../../models";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { isLineShape } from "../../../shapes/line";

interface Option {
  type?: "position" | "size" | "rotation";
}

export function newBoundsEyedropperState(option: Option): AppCanvasState {
  let targetId: string | undefined;
  let pickedId: string | undefined;
  let excludeCandidateIds: string[];

  function getPatch(ctx: AppCanvasStateContext, preview = false) {
    if (!targetId || !pickedId) return;
    const shapeComposite = ctx.getShapeComposite();
    const target = shapeComposite.shapeMap[targetId];
    const picked = shapeComposite.mergedShapeMap[pickedId];
    if (!target || !picked) return;

    let patch: Partial<Shape>;
    switch (option.type) {
      case "size": {
        const [pickedRect] = getRectWithRotationFromRectPolygon(shapeComposite.getLocalRectPolygon(picked));
        patch = shapeComposite.transformShape(
          target,
          getScaleToAffine(shapeComposite, target, { x: pickedRect.width, y: pickedRect.height }),
        );
        break;
      }
      case "rotation": {
        patch = shapeComposite.transformShape(target, getRotateToAffine(shapeComposite, target, picked.rotation));
        break;
      }
      default: {
        patch = shapeComposite.transformShape(target, getMoveToAffine(shapeComposite, target, picked.p));
        break;
      }
    }

    if (preview) {
      patch.alpha = (target.alpha ?? 1) * 0.5;
    }
    return patch;
  }

  return {
    getLabel: () => "BoundsEyedropper",
    onStart: (ctx) => {
      targetId = ctx.getLastSelectedShapeId();
      if (!targetId) return ctx.states.newSelectionHubState;

      excludeCandidateIds = ctx
        .getShapeComposite()
        .shapes.filter((s) => isLineShape(s))
        .map((s) => s.id);
      excludeCandidateIds.push(targetId);
      ctx.setCommandExams([COMMAND_EXAM_SRC.COPY_BOUNDS]);
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      if (!targetId) return ctx.states.newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const patch = getPatch(ctx);
              if (patch) {
                ctx.updateShapes({ update: { [targetId]: patch } });
                ctx.setTmpShapeMap({});
              }
              return ctx.states.newSelectionHubState;
            }
            case 1:
              return { type: "stack-resume", getState: () => ctx.states.newPointerDownEmptyState(event.data.options) };
            default:
              return ctx.states.newSelectionHubState;
          }
        case "pointerhover": {
          const shapeComposite = ctx.getShapeComposite();
          const p = event.data.current;
          pickedId = shapeComposite.findShapeAt(p, undefined, excludeCandidateIds, undefined, ctx.getScale())?.id;

          const patch = getPatch(ctx, true);
          ctx.setTmpShapeMap(patch ? getPatchByLayouts(shapeComposite, { update: { [targetId]: patch } }) : {});
          ctx.redraw();
          return;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          return handleShapeUpdate(ctx, event, [targetId]);
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
      if (!targetId) return;

      const shapeComposite = ctx.getShapeComposite();
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();

      const latestTarget = shapeComposite.mergedShapeMap[targetId];
      if (latestTarget) {
        applyStrokeStyle(renderCtx, {
          color: style.selectionSecondaly,
          width: 2 * scale,
        });
        const polygon = shapeComposite.getLocalRectPolygon(latestTarget);
        renderCtx.beginPath();
        applyPath(renderCtx, polygon, true);
        renderCtx.stroke();
      }

      const picked = pickedId ? shapeComposite.mergedShapeMap[pickedId] : undefined;
      if (picked) {
        renderCtx.beginPath();
        scaleGlobalAlpha(renderCtx, 0.1, () => {
          applyFillStyle(renderCtx, {
            color: style.selectionPrimary,
          });
          const rectPath = shapeComposite.getLocalRectPolygon(picked);
          applyPath(renderCtx, rectPath, true);
          renderCtx.fill();
        });
        applyStrokeStyle(renderCtx, {
          color: style.selectionPrimary,
          width: 2 * scale,
          dash: "short",
        });
        renderCtx.stroke();
      }

      const p = ctx.getCursorPoint();
      applyFillStyle(renderCtx, { color: picked ? style.selectionSecondaly : style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.arc(p.x, p.y, 6 * scale, 0, TAU);
      renderCtx.fill();
    },
  };
}
