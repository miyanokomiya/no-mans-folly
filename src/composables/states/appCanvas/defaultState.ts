import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { getCommonCommandExams, handleIntransientEvent } from "./commons";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { newSelectionHubState } from "./selectionHubState";
import { defineIntransientState } from "./intransientState";

export const newDefaultState = defineIntransientState(() => {
  return state;
});

const state: AppCanvasState = {
  getLabel: () => "Default",
  onStart(ctx) {
    ctx.setCommandExams(getCommonCommandExams(ctx));
  },
  onEnd(ctx) {
    ctx.setCommandExams();
    ctx.setCursor();
  },
  handleEvent: (ctx, event) => {
    switch (event.type) {
      case "pointerdown":
        switch (event.data.options.button) {
          case 0: {
            const shapeComposite = ctx.getShapeComposite();
            const shape = shapeComposite.findShapeAt(event.data.point, undefined, undefined, undefined, ctx.getScale());
            if (shape) {
              ctx.selectShape(shape.id, event.data.options.ctrl);
              if (!event.data.options.ctrl) {
                if (event.data.options.alt) {
                  return newDuplicatingShapesState;
                } else {
                  return newSingleSelectedByPointerOnState;
                }
              }
              return newSelectionHubState;
            }

            return newRectangleSelectingState;
          }
          case 1:
            return newPanningState;
          case 2: {
            const shapeComposite = ctx.getShapeComposite();
            const shape = shapeComposite.findShapeAt(event.data.point, undefined, undefined, undefined, ctx.getScale());
            if (!shape) return;

            ctx.selectShape(shape.id);
            return newSelectionHubState;
          }
          default:
            return;
        }
      default:
        return handleIntransientEvent(ctx, event);
    }
  },
};
