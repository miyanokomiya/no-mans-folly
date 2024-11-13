import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { LineShape, getEdges, patchVertices } from "../../../../shapes/line";
import { add, getOuterRectangle, moveRect, sub } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { optimizeLinePath } from "../../../lineSnapping";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { TAU } from "../../../../utils/geometry";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { renderBezierControls } from "../../../lineBounding";
import { newPreserveAttachmentHandler, PreserveAttachmentHandler } from "../../../lineAttachmentHandler";
import { getSnappableCandidates } from "../commons";

interface Option {
  lineShape: LineShape;
  index: number;
}

export function newMovingLineSegmentState(option: Option): AppCanvasState {
  const targetSegment = getEdges(option.lineShape)[option.index];
  const movingRect = getOuterRectangle([targetSegment]);

  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let preserveAttachmentHandler: PreserveAttachmentHandler;

  function getLatestSegment(ctx: AppCanvasStateContext) {
    const shape = { ...option.lineShape, ...ctx.getTmpShapeMap()[option.lineShape.id] } as LineShape;
    const edges = getEdges(shape);
    return edges[option.index];
  }

  return {
    getLabel: () => "MovingLineSegment",
    onStart: (ctx) => {
      ctx.startDragging();

      const shapeComposite = ctx.getShapeComposite();
      const branchIdSet = new Set(shapeComposite.getAllBranchMergedShapes([option.lineShape.id]).map((s) => s.id));
      // Allow to snap itself, but excluce its children.
      const snappableCandidates = getSnappableCandidates(ctx, []).filter(
        (s) => s.id === option.lineShape.id || !branchIdSet.has(s.id),
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
        settings: ctx.getUserSetting(),
      });

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
          const d = sub(event.data.current, event.data.start);
          snappingResult = event.data.ctrl ? undefined : shapeSnapping.test(moveRect(movingRect, d));
          const translate = snappingResult ? add(d, snappingResult.diff) : d;

          let patch = patchVertices(option.lineShape, [
            [option.index, add(targetSegment[0], translate), undefined],
            [option.index + 1, add(targetSegment[1], translate), undefined],
          ]);

          const optimized = optimizeLinePath(ctx, { ...option.lineShape, ...patch });
          patch = optimized ? { ...patch, ...optimized } : patch;

          preserveAttachmentHandler.setActive(!!event.data.alt);
          const update = {
            [option.lineShape.id]: patch,
            ...preserveAttachmentHandler.getPatch(patch),
          };

          ctx.setTmpShapeMap(getPatchAfterLayouts(ctx.getShapeComposite(), { update }));
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
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;
      const segment = getLatestSegment(ctx);

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      scaleGlobalAlpha(renderCtx, 0.5, () => {
        renderCtx.beginPath();
        renderCtx.arc(targetSegment[0].x, targetSegment[0].y, vertexSize, 0, TAU);
        renderCtx.fill();
        renderCtx.beginPath();
        renderCtx.arc(targetSegment[1].x, targetSegment[1].y, vertexSize, 0, TAU);
        renderCtx.fill();
      });

      const line = ctx.getShapeComposite().mergedShapeMap[option.lineShape.id] as LineShape;
      renderBezierControls(renderCtx, style, scale, line);

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.arc(segment[0].x, segment[0].y, vertexSize, 0, TAU);
      renderCtx.fill();
      renderCtx.beginPath();
      renderCtx.arc(segment[1].x, segment[1].y, vertexSize, 0, TAU);
      renderCtx.fill();

      if (snappingResult) {
        const shapeComposite = ctx.getShapeComposite();
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeComposite.shapeMap[id]),
        });
      }

      preserveAttachmentHandler.render(renderCtx, style, scale, ctx.getTmpShapeMap());
    },
  };
}
