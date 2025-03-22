import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { LineShape, getEdges } from "../../../../shapes/line";
import { add, getRadian, rotate, sub } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { applyPath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { TAU } from "../../../../utils/geometry";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newPreserveAttachmentHandler, PreserveAttachmentHandler } from "../../../lineAttachmentHandler";
import { newCacheWithArg } from "../../../../utils/stateful/cache";
import { newVectorsSnapping, renderVectorSnappingResult, VectorSnappingsResult } from "../../../vectorSnapping";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { getPatchByExtrudeLineSegment } from "../../../../shapes/utils/line";
import { handleCommonWheel } from "../../commons";
import { getSnappableCandidates } from "../commons";

interface Option {
  lineShape: LineShape;
  index: number;
}

export function newExtrudingLineSegmentState(option: Option): AppCanvasState {
  let snappingResult: VectorSnappingsResult | undefined;
  let preserveAttachmentHandler: PreserveAttachmentHandler;
  let editing = false;

  function getMovingSegment(ctx: AppCanvasStateContext) {
    const shapeComposite = ctx.getShapeComposite();
    const shape = shapeComposite.mergedShapeMap[option.lineShape.id] as LineShape;
    const edges = getEdges(shape);
    return edges[option.index + (editing ? 1 : 0)];
  }

  const snappingCache = newCacheWithArg((ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    // Allow to snap to the line itself.
    const snappableShapes = getSnappableCandidates(ctx, [option.lineShape.id]).concat([option.lineShape]);
    const targetSegment = getEdges(option.lineShape)[option.index];
    const vector = rotate({ x: 1, y: 0 }, getRadian(targetSegment[1], targetSegment[0]) + Math.PI / 2);
    const gridSnapping = ctx.getGrid().getSnappingLines();
    return newVectorsSnapping({
      origins: targetSegment,
      vector,
      snappableShapes,
      gridSnapping,
      getShapeStruct: shapeComposite.getShapeStruct,
      snappableOrigin: true,
    });
  });

  return {
    getLabel: () => "ExtrudingLineSegment",
    onStart: (ctx) => {
      ctx.startDragging();

      const shapeComposite = ctx.getShapeComposite();
      preserveAttachmentHandler = newPreserveAttachmentHandler({ shapeComposite, lineId: option.lineShape.id });
      if (preserveAttachmentHandler.hasAttachment) {
        ctx.setCommandExams([COMMAND_EXAM_SRC.PRESERVE_ATTACHMENT, COMMAND_EXAM_SRC.DISABLE_SNAP]);
      } else {
        ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);
      }
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const targetSegment = getEdges(option.lineShape)[option.index];
          const p = event.data.current;
          const d = sub(p, event.data.startAbs);
          let translate = d;
          snappingResult = undefined;
          if (!event.data.ctrl) {
            const movingSegment = targetSegment.map((t) => add(t, d));
            snappingResult = snappingCache.getValue(ctx).hitTest(movingSegment, ctx.getScale());
            translate = snappingResult ? add(d, snappingResult.v) : d;
          }

          const patch = getPatchByExtrudeLineSegment(option.lineShape, option.index, translate);
          preserveAttachmentHandler.setActive(!!event.data.alt);
          const update = {
            [option.lineShape.id]: patch,
            ...preserveAttachmentHandler.getPatch(patch),
          };

          ctx.setTmpShapeMap(getPatchAfterLayouts(ctx.getShapeComposite(), { update }));
          editing = true;
          return;
        }
        case "pointerup": {
          const tmpMap = ctx.getTmpShapeMap();
          if (Object.keys(tmpMap).length > 0) {
            ctx.patchShapes(tmpMap);
          }
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "keydown": {
          switch (event.data.key) {
            case "Escape":
              return ctx.states.newSelectionHubState;
            case "g":
              if (event.data.shift) return;
              ctx.patchUserSetting({ grid: ctx.getGrid().disabled ? "on" : "off" });
              snappingCache.update();
              return;
            default:
              return;
          }
        }
        case "wheel":
          handleCommonWheel(ctx, event);
          snappingCache.update();
          return;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;
      const segment = getMovingSegment(ctx);
      const targetSegment = getEdges(option.lineShape)[option.index];

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      scaleGlobalAlpha(renderCtx, 0.5, () => {
        renderCtx.beginPath();
        renderCtx.arc(targetSegment[0].x, targetSegment[0].y, vertexSize, 0, TAU);
        renderCtx.arc(targetSegment[1].x, targetSegment[1].y, vertexSize, 0, TAU);
        renderCtx.fill();
      });

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.arc(segment[0].x, segment[0].y, vertexSize, 0, TAU);
      renderCtx.arc(segment[1].x, segment[1].y, vertexSize, 0, TAU);
      renderCtx.fill();

      snappingResult?.results.forEach((result) => {
        renderVectorSnappingResult(renderCtx, { style, scale, result });
      });
      if (snappingResult?.results[0].snapped === "origin") {
        applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * scale });
        renderCtx.beginPath();
        applyPath(renderCtx, targetSegment);
        renderCtx.stroke();
      }

      preserveAttachmentHandler.render(renderCtx, style, scale, ctx.getTmpShapeMap());
    },
  };
}
