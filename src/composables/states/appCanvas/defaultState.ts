import type { AppCanvasState } from "./core";
import { getCommonCommandExams, handleIntransientEvent, isShapeInteratctiveWithinViewport } from "./commons";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { defineIntransientState } from "./intransientState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";

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
    ctx.setContextMenuList();
  },
  handleEvent: (ctx, event) => {
    switch (event.type) {
      case "pointerdown":
        switch (event.data.options.button) {
          case 0: {
            const shapeComposite = ctx.getShapeComposite();
            const shape = shapeComposite.findShapeAt(event.data.point, undefined, undefined, undefined, ctx.getScale());
            if (shape && isShapeInteratctiveWithinViewport(ctx, shape)) {
              ctx.selectShape(shape.id, event.data.options.ctrl);
              if (!event.data.options.ctrl) {
                if (event.data.options.alt) {
                  return newDuplicatingShapesState;
                } else {
                  return newSingleSelectedByPointerOnState;
                }
              }
              return ctx.states.newSelectionHubState;
            }

            return newPointerDownEmptyState;
          }
          case 1:
            return () => newPointerDownEmptyState(event.data.options);
          case 2: {
            const shapeComposite = ctx.getShapeComposite();
            const shape = shapeComposite.findShapeAt(event.data.point, undefined, undefined, undefined, ctx.getScale());
            if (!shape) return;

            ctx.selectShape(shape.id);
            return ctx.states.newSelectionHubState;
          }
          default:
            return;
        }
      default:
        return handleIntransientEvent(ctx, event);
    }
  },
};
