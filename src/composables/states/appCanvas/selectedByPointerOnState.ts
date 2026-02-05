import type { AppCanvasState } from "./core";
import { startTextEditingIfPossible } from "./commons";
import { isRigidShape } from "../../../shapes";
import { newFuzzyDrag } from "../../pointer";
import { findBackward } from "../../../utils/commons";

interface Option {
  concurrent?: boolean; // Set true, when the target shape has already been selected.
}

export function newSelectedByPointerOnState(option?: Option): AppCanvasState {
  const fuzzyDrag = newFuzzyDrag();

  return {
    getLabel: () => "SelectedByPointerOn",
    onStart: (ctx) => {
      ctx.startDragging();
      fuzzyDrag.onDown(Date.now());
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          fuzzyDrag.onMove(Date.now(), event.data);
          if (!fuzzyDrag.isDragging()) return;

          const shapeComposite = ctx.getShapeComposite();
          const shape = shapeComposite.shapeMap[ctx.getLastSelectedShapeId() ?? ""];
          if (!shape) {
            return ctx.states.newSelectionHubState;
          }

          if (
            Object.keys(ctx.getSelectedShapeIdMap()).length === 1 &&
            shapeComposite.attached(shape) &&
            event.data.shift
          ) {
            const lineId = shape.attachment.id;
            return () =>
              ctx.states.newMovingAnchorOnLineState({
                lineId,
                shapeId: shape.id,
              });
          }

          // Shouldn't move locked shape
          if (shape.locked) {
            const parentPath = shapeComposite.getBranchPathTo(shape.id);
            const unrigidParentId = findBackward(
              parentPath,
              (id) => !isRigidShape(shapeComposite.getShapeStruct, shapeComposite.shapeMap[id]),
            );
            if (unrigidParentId) {
              // Select and move the closest unrigid parent when it exists
              ctx.selectShape(unrigidParentId);
              return () => ctx.states.newMovingHubState({ ...event.data });
            }
            return ctx.states.newSelectionHubState;
          }

          // Ridig shape can move only when it's selected
          const isRigid = isRigidShape(shapeComposite.getShapeStruct, shape);
          if (option?.concurrent || !isRigid) return () => ctx.states.newMovingHubState({ ...event.data });

          // Deselect the rigid shape and activate rect-select
          ctx.selectShape(shape.id, true);
          return () => ctx.states.newRectangleSelectingState({ keepSelection: event.data.ctrl });
        }
        case "pointerup": {
          if (!event.data.options.ctrl && option?.concurrent && Date.now() - fuzzyDrag.getTimestampOnDown() < 200) {
            const result = startTextEditingIfPossible(ctx, ctx.getLastSelectedShapeId(), event.data.point);
            if (result) return result;
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
  };
}
