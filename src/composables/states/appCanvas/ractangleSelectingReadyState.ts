import type { AppCanvasState } from "./core";
import { handleCommonWheel, handleStateEvent } from "./commons";
import { newSelectionHubState } from "./selectionHubState";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { applyPath } from "../../../utils/renderer";
import { COMMAND_EXAM_SRC } from "./commandExams";

export function newRactangleSelectingReadyState(): AppCanvasState {
  return {
    getLabel: () => "RectangleSelectingReady",
    onStart: (ctx) => {
      ctx.setCommandExams([COMMAND_EXAM_SRC.KEEP_SELECTION]);
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown": {
          switch (event.data.options.button) {
            case 0:
              return () => newRectangleSelectingState({ keepSelection: event.data.options.ctrl });
          }
          return;
        }
        case "wheel":
          handleCommonWheel(ctx, event);
          return;
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return newSelectionHubState;
            default:
              return;
          }
        case "state":
          return handleStateEvent(ctx, event, ["Break", "DroppingNewShape", "LineReady", "TextReady"]);
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const shapeComposite = ctx.getShapeComposite();
      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      const shapes = selectedIds.map((id) => shapeComposite.shapeMap[id]).filter((s) => s);

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * ctx.getScale() });
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, shapeComposite.getLocalRectPolygon(s), true));
      renderCtx.stroke();
    },
  };
}
