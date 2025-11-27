import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { LineShape, getEdges, getLinePath, patchVertices } from "../../../../shapes/line";
import { add, getOuterRectangle, getRadian, IVec2, moveRect, rotate, sub } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { optimizeLinePath } from "../../../lineSnapping";
import { SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { applyPath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { TAU } from "../../../../utils/geometry";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { renderBezierControls } from "../../../lineBounding";
import { newPreserveAttachmentHandler, PreserveAttachmentHandler } from "../../../lineAttachmentHandler";
import { getSnappableCandidates } from "../commons";
import { newCacheWithArg } from "../../../../utils/stateful/cache";
import { newVectorsSnapping, renderVectorSnappingResult, VectorSnappingsResult } from "../../../vectorSnapping";
import { handleCommonWheel } from "../../commons";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { handleLineVertexExistence } from "../utils/shapeUpdatedEventHandlers";

interface Option {
  lineShape: LineShape;
  index: number;
  // The absolute position of the cursor when the dragging starts.
  // => It's used for seamless state transition while dragging.
  startAbs?: IVec2;
}

export function newMovingLineSegmentState(option: Option): AppCanvasState {
  const targetSegment = getEdges(option.lineShape)[option.index];
  const movingRect = getOuterRectangle([targetSegment]);
  const vertices = getLinePath(option.lineShape);
  const vector = rotate({ x: 1, y: 0 }, getRadian(vertices[option.index + 1], vertices[option.index]) + Math.PI / 2);
  const snappingOrigins = [
    vertices[option.index],
    vertices[option.index + 1],
    ...(option.index > 0 ? [vertices[option.index - 1]] : []),
    ...(option.index < vertices.length - 2 ? [vertices[option.index + 2]] : []),
  ];

  let snappingResult: SnappingResult | undefined;
  let vectorSnappingResult: VectorSnappingsResult | undefined;
  let preserveAttachmentHandler: PreserveAttachmentHandler;
  let startAbs: IVec2 | undefined;

  function getLatestSegment(ctx: AppCanvasStateContext) {
    const shape = { ...option.lineShape, ...ctx.getTmpShapeMap()[option.lineShape.id] } as LineShape;
    const edges = getEdges(shape);
    return edges[option.index];
  }

  const snappingCache = newCacheWithArg((ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    // Allow to snap to the line itself.
    const snappableShapes = getSnappableCandidates(ctx, [option.lineShape.id]).concat([option.lineShape]);
    const gridSnapping = ctx.getGrid().getSnappingLines();
    const vectorSnapping = newVectorsSnapping({
      origins: snappingOrigins,
      vector,
      snappableShapes,
      gridSnapping,
      getShapeStruct: shapeComposite.getShapeStruct,
      snappableOrigin: true,
    });
    const shapeSnapping = newShapeSnapping({
      shapeSnappingList: snappableShapes.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
      gridSnapping,
      settings: ctx.getUserSetting(),
    });
    return { vectorSnapping, shapeSnapping };
  });

  function getLinePatch(ctx: AppCanvasStateContext, translate: IVec2) {
    const patch = patchVertices(option.lineShape, [
      [option.index, add(targetSegment[0], translate), undefined],
      [option.index + 1, add(targetSegment[1], translate), undefined],
    ]);
    const optimized = optimizeLinePath(ctx, { ...option.lineShape, ...patch });
    return optimized ? { ...patch, ...optimized } : patch;
  }

  return {
    getLabel: () => "MovingLineSegment",
    onStart: (ctx) => {
      ctx.startDragging();

      const shapeComposite = ctx.getShapeComposite();
      preserveAttachmentHandler = newPreserveAttachmentHandler({ shapeComposite, lineId: option.lineShape.id });
      if (preserveAttachmentHandler.hasAttachment) {
        ctx.setCommandExams([
          COMMAND_EXAM_SRC.EXTRUDE_LINE_SEGMENT,
          COMMAND_EXAM_SRC.PRESERVE_ATTACHMENT,
          COMMAND_EXAM_SRC.DISABLE_SNAP,
        ]);
      } else {
        ctx.setCommandExams([COMMAND_EXAM_SRC.EXTRUDE_LINE_SEGMENT, COMMAND_EXAM_SRC.DISABLE_SNAP]);
      }

      if (option.startAbs) {
        startAbs = option.startAbs;
        const d = sub(ctx.getCursorPoint(), startAbs);
        const patch = getLinePatch(ctx, d);
        const update = { [option.lineShape.id]: patch };
        ctx.setTmpShapeMap(getPatchAfterLayouts(ctx.getShapeComposite(), { update }));
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
          startAbs = startAbs ?? event.data.startAbs;
          const d = sub(event.data.current, startAbs);
          snappingResult = undefined;
          vectorSnappingResult = undefined;
          if (!event.data.ctrl) {
            const result1 = snappingCache
              .getValue(ctx)
              .shapeSnapping.test(moveRect(movingRect, d), undefined, ctx.getScale());
            let movingSegment = targetSegment.map((t) => add(t, d));
            if (snappingOrigins.length === 4) {
              movingSegment = movingSegment.concat(movingSegment);
            }
            const result2 = snappingCache.getValue(ctx).vectorSnapping.hitTest(movingSegment, ctx.getScale());
            if (result2) {
              vectorSnappingResult = result2;
            } else {
              snappingResult = result1;
            }
          }

          const translate = add(d, snappingResult?.diff ?? vectorSnappingResult?.v ?? { x: 0, y: 0 });
          const patch = getLinePatch(ctx, translate);

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
        case "shape-updated": {
          return handleLineVertexExistence(ctx, event, option.lineShape.id, option.index + 1);
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
            case "e":
              return () =>
                ctx.states.newExtrudingLineSegmentState({
                  lineShape: option.lineShape,
                  index: option.index,
                  startAbs,
                });
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

      applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });
      renderCtx.beginPath();
      applyPath(renderCtx, targetSegment);
      renderCtx.stroke();

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
          getTargetRect: (id) =>
            shapeComposite.mergedShapeMap[id]
              ? shapeComposite.getWrapperRect(shapeComposite.mergedShapeMap[id])
              : undefined,
        });
      }
      vectorSnappingResult?.results.forEach((result) => {
        renderVectorSnappingResult(renderCtx, { style, scale, result });
      });

      preserveAttachmentHandler.render(renderCtx, style, scale, ctx.getTmpShapeMap());
    },
  };
}
