import { add, getDistance, getOuterRectangle, getRadian, multi, rotate } from "okageo";
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
import { ShapeComposite } from "../../../shapeComposite";

interface Option {
  lineShape: LineShape;
  index: number;
  originIndex?: 0 | 1;
  relativeRadian?: boolean;
}

export function newLineSegmentEditingState(option: Option): AppCanvasState {
  const lineShape = option.lineShape;
  let cancel = false;
  let lineSegmentEditingHandler: LineSegmentEditingHandler;
  const originIndex = option.originIndex ?? 0;
  const relativeRadian = !!option.relativeRadian;

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
    const vertices = getLinePath(patchedLineShape);
    const segmentSrc = getSegments(vertices)[option.index];
    const segment: ISegment = originIndex === 1 ? [segmentSrc[1], segmentSrc[0]] : [segmentSrc[0], segmentSrc[1]];

    if (relativeRadian) {
      const relativeOrigin = vertices.at(option.index + (originIndex === 1 ? 1 : -1));
      if (relativeOrigin) {
        lineSegmentEditingHandler = newLineSegmentEditingHandler({
          segment,
          originRadian: getRadian(relativeOrigin, segment[0]),
        });
        return;
      }
    }
    lineSegmentEditingHandler = newLineSegmentEditingHandler({ segment, originRadian: 0 });
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
          const linePatch = patchLine(
            ctx.getShapeComposite(),
            lineShape.id,
            option.index,
            originIndex,
            event.data.size,
            event.data.radian,
          );
          ctx.setTmpShapeMap(linePatch ? { [lineShape.id]: linePatch } : {});
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

function patchLine(
  shapeComposite: ShapeComposite,
  id: string,
  index: number,
  originIndex: number,
  size: number | undefined,
  radian: number | undefined,
) {
  const src = shapeComposite.shapeMap[id] as LineShape;
  const segmentsSrc = getSegments(getLinePath(src))[index];
  const segmentSrc: ISegment = originIndex === 1 ? [segmentsSrc[1], segmentsSrc[0]] : segmentsSrc;

  const latestLineShape = shapeComposite.mergedShapeMap[id] as LineShape;
  const segmentsLatest = getSegments(getLinePath(latestLineShape))[index];
  const segmentLatest: ISegment = originIndex === 1 ? [segmentsLatest[1], segmentsLatest[0]] : segmentsLatest;

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
