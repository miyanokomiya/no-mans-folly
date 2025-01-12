import type { AppCanvasState } from "./core";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newMovingLineLabelState } from "./lines/movingLineLabelState";
import { newMovingShapeState } from "./movingShapeState";
import { newTreeNodeMovingState } from "./tree/treeNodeMovingState";
import { newTreeRootMovingState } from "./tree/treeRootMovingState";
import { newBoardColumnMovingState } from "./board/boardColumnMovingState";
import { newBoardLaneMovingState } from "./board/boardLaneMovingState";
import { isLineLabelShape } from "../../../shapes/utils/lineLabel";
import { ModifierOptions } from "../../../utils/devices";

interface Option extends ModifierOptions {
  boundingBox?: BoundingBox;
}

export function newMovingHubState(option?: Option): AppCanvasState {
  return {
    getLabel: () => "MovingHub",
    onStart(ctx) {
      ctx.setLinkInfo();

      const shapeMap = ctx.getShapeComposite().shapeMap;
      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      const unlockedSelectedIds = selectedIds.filter((id) => !shapeMap[id].locked);

      const unlockedCount = unlockedSelectedIds.length;
      if (unlockedCount === 0) return () => ctx.states.newSelectionHubState({ boundingBox: option?.boundingBox });

      if (selectedIds.length !== unlockedCount) {
        ctx.multiSelectShapes(unlockedSelectedIds);
      }

      if (unlockedCount === 1) {
        const shape = shapeMap[unlockedSelectedIds[0]];

        const shapeComposite = ctx.getShapeComposite();
        const boundingBox =
          option?.boundingBox ??
          newBoundingBox({
            path: shapeComposite.getLocalRectPolygon(shape),
          });

        if (isLineLabelShape(shapeComposite, shape)) {
          return () => newMovingLineLabelState({ boundingBox });
        }

        switch (shape.type) {
          case "tree_root":
            return () => newTreeRootMovingState({ targetId: shape.id });
          case "tree_node":
            return () => newTreeNodeMovingState({ targetId: shape.id });
          case "board_column":
            return newBoardColumnMovingState;
          case "board_lane":
            return newBoardLaneMovingState;
          default:
            return () => ctx.states.newMovingShapeState(option);
        }
      } else {
        const types = new Set(unlockedSelectedIds.map((id) => shapeMap[id].type));
        if (types.size === 1) {
          const type = Array.from(types)[0];
          switch (type) {
            case "board_column":
              return newBoardColumnMovingState;
            case "board_lane":
              return newBoardLaneMovingState;
          }
        }

        return () => ctx.states.newMovingShapeState(option);
      }
    },
    handleEvent() {},
  };
}
