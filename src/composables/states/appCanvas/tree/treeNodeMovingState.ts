import type { AppCanvasState } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { TreeNodeShape } from "../../../../shapes/tree/treeNode";
import {
  TreeNodeMovingHandler,
  newTreeNodeMovingHandler,
  TreeNodeMovingResult,
  isSameTreeNodeMovingResult,
} from "../../../treeHandler";

interface Option {
  targetId: string;
}

export function newTreeNodeMovingState(option: Option): AppCanvasState {
  let treeNodeShape: TreeNodeShape;
  let treeMovingHandler: TreeNodeMovingHandler;
  let movingResult: TreeNodeMovingResult | undefined;

  return {
    getLabel: () => "TreeNodeMoving",
    onStart: (ctx) => {
      ctx.startDragging();
      treeNodeShape = ctx.getShapeComposite().shapeMap[option.targetId] as TreeNodeShape;

      treeMovingHandler = newTreeNodeMovingHandler({
        getShapeComposite: ctx.getShapeComposite,
        targetId: treeNodeShape.id,
      });
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      if (!treeNodeShape) return newSelectionHubState;

      switch (event.type) {
        case "pointermove": {
          const result = treeMovingHandler.moveTest(event.data.current);
          if (!isSameTreeNodeMovingResult(result, movingResult)) {
            ctx.redraw();
            movingResult = result;
          }
          return;
        }
        case "pointerup": {
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      treeMovingHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale(), movingResult);
    },
  };
}
