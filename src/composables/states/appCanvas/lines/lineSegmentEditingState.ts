import { getLinePath, LineShape } from "../../../../shapes/line";
import { getSegments } from "../../../../utils/geometry";
import { renderOverlay } from "../../../../utils/renderer";
import {
  LineSegmentEditingHandler,
  newLineSegmentEditingHandler,
} from "../../../shapeHandlers/lineSegmentEditingHandler";
import { handleCommonWheel } from "../../commons";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { AppCanvasState } from "../core";

interface Option {
  lineShape: LineShape;
  index: number;
}

export function newLineSegmentEditingState(option: Option): AppCanvasState {
  const lineShape = option.lineShape;
  const segment = getSegments(getLinePath(lineShape))[option.index];
  let cancel = false;
  let lineSegmentEditingHandler: LineSegmentEditingHandler;
  let originIndex: 0 | 1 = 0;

  const render: AppCanvasState["render"] = (ctx, renderCtx) => {
    const style = ctx.getStyleScheme();
    const scale = ctx.getScale();
    renderOverlay(renderCtx, ctx.getViewRect());
    lineSegmentEditingHandler.render(renderCtx, style, scale);
  };

  return {
    getLabel: () => "LineSegmentEditing",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      ctx.setCommandExams([COMMAND_EXAM_SRC.CANCEL]);

      lineSegmentEditingHandler = newLineSegmentEditingHandler({
        segment,
        originIndex,
      });
    },
    onResume: (ctx) => {
      ctx.showFloatMenu();
      ctx.setCommandExams([COMMAND_EXAM_SRC.CANCEL]);
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCommandExams();
      console.log(cancel);
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown": {
          const hitResult = lineSegmentEditingHandler.hitTest(event.data.point, ctx.getScale());
          if (hitResult) {
            originIndex = originIndex === 0 ? 1 : 0;
            lineSegmentEditingHandler = newLineSegmentEditingHandler({
              segment,
              originIndex,
            });
            ctx.redraw();
            return;
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
