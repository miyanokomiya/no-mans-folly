import { add, getDistance, getOuterRectangle, getRadian, multi, rotate } from "okageo";
import { getLinePath, LineShape, patchVertex } from "../../../../shapes/line";
import { getSegments } from "../../../../utils/geometry";
import { applyPath, renderOutlinedCircle, renderOverlay } from "../../../../utils/renderer";
import {
  getSegmentOriginRadian,
  getTargetSegment,
  LineSegmentEditingHandler,
  newLineSegmentEditingHandler,
} from "../../../shapeHandlers/lineSegmentEditingHandler";
import { handleCommonWheel } from "../../commons";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { AppCanvasState, AppCanvasStateContext } from "../core";
import { isObjectEmpty } from "../../../../utils/commons";
import { ShapeComposite } from "../../../shapeComposite";
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

  const setupUIs = (ctx: AppCanvasStateContext) => {
    ctx.showFloatMenu({
      targetRect: getOuterRectangle([getSegments(getLinePath(lineShape))[option.index]]),
      type: "line-segment",
      data: {
        shapeId: lineShape.id,
        segmentIndex: option.index,
        originIndex,
        relativeAngle,
      },
    });
    ctx.setCommandExams([COMMAND_EXAM_SRC.CANCEL]);
  };
  const setupHandler = (ctx: AppCanvasStateContext, linePatch?: Partial<LineShape>) => {
    const shapeComposite = ctx.getShapeComposite();
    const latestLineShape = shapeComposite.mergedShapeMap[lineShape.id] as LineShape;
    const patchedLineShape = linePatch ? { ...latestLineShape, ...linePatch } : latestLineShape;
    const vertices = getLinePath(patchedLineShape);
    const segment = getTargetSegment(vertices, option.index, originIndex);
    lineSegmentEditingHandler = newLineSegmentEditingHandler({
      segment,
      originRadian: getSegmentOriginRadian(vertices, option.index, originIndex, relativeAngle),
    });
  };

  return {
    getLabel: () => "LineSegmentEditing",
    onStart: (ctx) => {
      relativeAngle = ctx.getUserSetting().lineSegmentRelativeAngle === "on";
      setupUIs(ctx);
      setupHandler(ctx);
    },
    onResume: (ctx) => {
      setupUIs(ctx);
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
          if ("relativeAngle" in event.data) {
            relativeAngle = event.data.relativeAngle;
            setupUIs(ctx);
            setupHandler(ctx);
            ctx.patchUserSetting({ lineSegmentRelativeAngle: relativeAngle ? "on" : "off" });
            ctx.redraw();
            return;
          }

          if ("reset" in event.data) {
            ctx.setTmpShapeMap({});
            setupHandler(ctx);
            return;
          }

          const shapeComposite = ctx.getShapeComposite();
          const linePatch = patchLine(
            shapeComposite,
            lineShape.id,
            option.index,
            originIndex,
            event.data.size,
            event.data.radian,
          );
          const patch = linePatch
            ? getPatchAfterLayouts(shapeComposite, { update: { [lineShape.id]: linePatch } })
            : {};
          ctx.setTmpShapeMap(patch);
          setupHandler(ctx, patch[lineShape.id]);
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

function patchLine(
  shapeComposite: ShapeComposite,
  id: string,
  index: number,
  originIndex: 0 | 1,
  size: number | undefined,
  radian: number | undefined,
) {
  const src = shapeComposite.shapeMap[id] as LineShape;
  const segmentSrc = getTargetSegment(getLinePath(src), index, originIndex);

  const latestLineShape = shapeComposite.mergedShapeMap[id] as LineShape;
  const segmentLatest = getTargetSegment(getLinePath(latestLineShape), index, originIndex);

  if (size !== undefined) {
    const p = add(multi(rotate({ x: 1, y: 0 }, getRadian(segmentLatest[1], segmentLatest[0])), size), segmentSrc[0]);
    return patchVertex(src, index + 1 - originIndex, p, undefined);
  }
  if (radian !== undefined) {
    const p = add(
      multi(rotate({ x: 1, y: 0 }, radian), getDistance(segmentLatest[0], segmentLatest[1])),
      segmentSrc[0],
    );
    return patchVertex(src, index + 1 - originIndex, p, undefined);
  }
}
