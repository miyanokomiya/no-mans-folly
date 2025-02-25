import { add, getOuterRectangle, getRadian, multi, rotate } from "okageo";
import { getLinePath, LineShape, patchVertex } from "../../../../shapes/line";
import { getSegments, ISegment } from "../../../../utils/geometry";
import { renderOverlay } from "../../../../utils/renderer";
import {
  LineSegmentEditingHandler,
  newLineSegmentEditingHandler,
} from "../../../shapeHandlers/lineSegmentEditingHandler";
import { handleCommonWheel } from "../../commons";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { AppCanvasState, AppCanvasStateContext } from "../core";
import { isObjectEmpty } from "../../../../utils/commons";

interface Option {
  lineShape: LineShape;
  index: number;
  originIndex?: 0 | 1;
}

export function newLineSegmentEditingState(option: Option): AppCanvasState {
  const lineShape = option.lineShape;
  let cancel = false;
  let lineSegmentEditingHandler: LineSegmentEditingHandler;
  const originIndex = option.originIndex ?? 0;

  const render: AppCanvasState["render"] = (ctx, renderCtx) => {
    const style = ctx.getStyleScheme();
    const scale = ctx.getScale();
    renderOverlay(renderCtx, ctx.getViewRect());
    lineSegmentEditingHandler.render(renderCtx, style, scale);
  };

  const setupUIs = (ctx: AppCanvasStateContext) => {
    ctx.showFloatMenu({
      targetRect: getOuterRectangle([getSegments(getLinePath(lineShape))[option.index]]),
      type: "line-segment",
      data: {
        shapeId: lineShape.id,
        segmentIndex: option.index,
      },
    });
    ctx.setCommandExams([COMMAND_EXAM_SRC.CANCEL]);
  };
  const setupHandler = (ctx: AppCanvasStateContext, linePatch?: Partial<LineShape>) => {
    const shapeComposite = ctx.getShapeComposite();
    const latestLineShape = shapeComposite.mergedShapeMap[lineShape.id] as LineShape;
    const patchedLineShape = linePatch ? { ...latestLineShape, ...linePatch } : latestLineShape;
    const segmentSrc = getLinePath(patchedLineShape);
    const segment: ISegment = originIndex === 1 ? [segmentSrc[1], segmentSrc[0]] : [segmentSrc[0], segmentSrc[1]];
    lineSegmentEditingHandler = newLineSegmentEditingHandler({ segment });
  };

  return {
    getLabel: () => "LineSegmentEditing",
    onStart: (ctx) => {
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
          const segmentSrc = getLinePath(lineShape);
          const segment: ISegment = originIndex === 1 ? [segmentSrc[1], segmentSrc[0]] : [segmentSrc[0], segmentSrc[1]];
          const p = add(multi(rotate({ x: 1, y: 0 }, getRadian(segment[1], segment[0])), event.data.size), segment[0]);
          const linePatch = patchVertex(lineShape, option.index + 1 - originIndex, p, undefined);
          ctx.setTmpShapeMap({ [lineShape.id]: linePatch });
          setupHandler(ctx, linePatch);
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
