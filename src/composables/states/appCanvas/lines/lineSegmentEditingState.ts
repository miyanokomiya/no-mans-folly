import { getDistance, getOuterRectangle, getRadian } from "okageo";
import { getLinePath, LineShape } from "../../../../shapes/line";
import { getSegments } from "../../../../utils/geometry";
import { applyPath, renderOutlinedCircle, renderOverlay } from "../../../../utils/renderer";
import {
  getSegmentOriginRadian,
  getSegmentRadian,
  getTargetSegment,
  LineSegmentEditingHandler,
  newLineSegmentEditingHandler,
  patchLineSegment,
} from "../../../shapeHandlers/lineSegmentEditingHandler";
import { handleCommonWheel } from "../../commons";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { AppCanvasState, AppCanvasStateContext } from "../core";
import { isObjectEmpty } from "../../../../utils/commons";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";

interface Option {
  lineShape: LineShape;
  index: number;
  originIndex?: 0 | 1;
}

export function newLineSegmentEditingState(option: Option): AppCanvasState {
  const lineShape = option.lineShape;
  const originIndex = option.originIndex ?? 0;
  let cancel = false;
  let lineSegmentEditingHandler: LineSegmentEditingHandler;
  let relativeAngle = false;
  // Keep segment radian in case the segment becomes zero sized.
  let segmentRadian = 0;

  const render: AppCanvasState["render"] = (ctx, renderCtx) => {
    const style = ctx.getStyleScheme();
    const scale = ctx.getScale();
    renderOverlay(renderCtx, ctx.getViewRect());
    const shapeComposite = ctx.getShapeComposite();
    const latestLineShape = shapeComposite.mergedShapeMap[lineShape.id] as LineShape;
    const vertices = getLinePath(latestLineShape);
    applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, dash: "short", width: 2 * scale });
    renderCtx.beginPath();
    applyPath(renderCtx, vertices);
    renderCtx.stroke();
    vertices.forEach((v) => {
      renderOutlinedCircle(renderCtx, v, 4 * scale, style.selectionSecondaly);
    });
    lineSegmentEditingHandler.render(renderCtx, style, scale);
  };

  const updateState = (ctx: AppCanvasStateContext, linePatch?: Partial<LineShape>) => {
    const shapeComposite = ctx.getShapeComposite();

    const shapeSrc = shapeComposite.shapeMap[lineShape.id] as LineShape;
    const verticesSrc = getLinePath(shapeSrc);
    const segmentSrc = getTargetSegment(verticesSrc, option.index, originIndex);
    const radianSrc = getRadian(segmentSrc[1], segmentSrc[0]);
    const sizeSrc = getDistance(segmentSrc[0], segmentSrc[1]);
    const originRadian = getSegmentOriginRadian(verticesSrc, option.index, originIndex, relativeAngle);

    const latestLineShape = shapeComposite.mergedShapeMap[lineShape.id] as LineShape;
    const patchedLineShape = linePatch ? { ...latestLineShape, ...linePatch } : latestLineShape;
    const vertices = getLinePath(patchedLineShape);
    const segment = getTargetSegment(vertices, option.index, originIndex);
    const radian = getSegmentRadian(segmentSrc, segment);
    const size = getDistance(segment[0], segment[1]);

    if (size !== 0) {
      segmentRadian = radian;
    }

    lineSegmentEditingHandler = newLineSegmentEditingHandler({
      segment,
      segmentSrc,
      originRadian,
      segmentRadian,
    });

    ctx.showFloatMenu({
      targetRect: getOuterRectangle([getSegments(getLinePath(lineShape))[option.index]]),
      type: "line-segment",
      data: {
        size: getDistance(segment[0], segment[1]),
        radian: segmentRadian - originRadian,
        relativeAngle,
        changed: radianSrc !== radian || sizeSrc !== size,
      },
    });
  };

  return {
    getLabel: () => "LineSegmentEditing",
    onStart: (ctx) => {
      relativeAngle = ctx.getUserSetting().lineSegmentRelativeAngle === "on";
      updateState(ctx);
      ctx.setCommandExams([COMMAND_EXAM_SRC.CANCEL]);
    },
    onResume: (ctx) => {
      updateState(ctx);
      ctx.setCommandExams([COMMAND_EXAM_SRC.CANCEL]);
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCommandExams();
      const update = ctx.getTmpShapeMap();
      ctx.setTmpShapeMap({});
      if (cancel || isObjectEmpty(update)) return;

      ctx.updateShapes({ update });
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown": {
          const hitResult = lineSegmentEditingHandler.hitTest(event.data.point, ctx.getScale());
          if (hitResult) {
            cancel = true;
            return () => ctx.states.newLineSegmentEditingState({ ...option, originIndex: originIndex === 0 ? 1 : 0 });
          }

          ctx.hideFloatMenu();
          ctx.setCommandExams();
          return {
            type: "stack-resume",
            getState: () =>
              ctx.states.newPointerDownEmptyState({
                ...event.data.options,
                preventSelecting: true,
                renderWhilePanning: render,
              }),
          };
        }
        case "pointerhover": {
          const hitResult = lineSegmentEditingHandler.hitTest(event.data.current, ctx.getScale());
          if (lineSegmentEditingHandler.saveHitResult(hitResult)) {
            ctx.redraw();
          }
          return;
        }
        case "keydown": {
          switch (event.data.key) {
            case "Escape": {
              cancel = true;
              return ctx.states.newSelectionHubState;
            }
          }
          return;
        }
        case "line-segment-change": {
          if ("reset" in event.data) {
            ctx.setTmpShapeMap({});
            updateState(ctx);
            return;
          }

          if ("relativeAngle" in event.data) {
            relativeAngle = event.data.relativeAngle;
            updateState(ctx);
            ctx.patchUserSetting({ lineSegmentRelativeAngle: relativeAngle ? "on" : "off" });
            ctx.redraw();
            return;
          }

          const shapeComposite = ctx.getShapeComposite();
          const linePatch = patchLineSegment(
            shapeComposite,
            lineShape.id,
            option.index,
            originIndex,
            segmentRadian,
            event.data.size,
            event.data.radian,
            relativeAngle,
          );
          const patch = linePatch
            ? getPatchAfterLayouts(shapeComposite, { update: { [lineShape.id]: linePatch } })
            : {};
          ctx.setTmpShapeMap(patch);
          updateState(ctx, patch[lineShape.id]);
          return;
        }
        case "history": {
          cancel = true;
          return ctx.states.newSelectionHubState;
        }
        case "wheel": {
          handleCommonWheel(ctx, event);
          return;
        }
        case "shape-updated": {
          if (event.data.keys.has(lineShape.id)) {
            cancel = true;
            return ctx.states.newSelectionHubState;
          }
          return;
        }
      }
    },
    render,
  };
}
