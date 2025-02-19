import type { AppCanvasState } from "../core";
import { SmartBranchHandler } from "../../../smartBranchHandler";
import { newFuzzyDrag } from "../../../pointer";
import { LineShape } from "../../../../shapes/line";

interface Option {
  smartBranchHandler: SmartBranchHandler;
}

export function newSmartBranchPointerDownState(option: Option): AppCanvasState {
  const fuzzyDrag = newFuzzyDrag();
  const smartBranchHandler = option.smartBranchHandler;
  const hitResult = smartBranchHandler.retrieveHitResult();

  return {
    getLabel: () => "SmartBranchPointerDown",
    onStart: (ctx) => {
      if (!hitResult) return ctx.states.newSelectionHubState;

      ctx.startDragging();
      fuzzyDrag.onDown(Date.now());
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      if (!hitResult) return ctx.states.newSelectionHubState;

      switch (event.type) {
        case "pointermove": {
          fuzzyDrag.onMove(Date.now(), event.data);
          if (fuzzyDrag.isDragging()) {
            const line: LineShape = {
              ...hitResult.previewShapes[1],
              id: ctx.generateUuid(),
              q: event.data.current,
              qConnection: undefined,
            };
            return () => ctx.states.newLineDrawingState({ shape: line });
          }
          return;
        }
        case "pointerup": {
          const branchShapes = smartBranchHandler.createBranch(
            hitResult.index,
            ctx.generateUuid,
            ctx.createLastIndex(),
          );
          ctx.addShapes(branchShapes);
          ctx.selectShape(branchShapes[0].id);
          return ctx.states.newSelectionHubState;
        }
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      smartBranchHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
}
