import type { AppCanvasState } from "./core";
import { newDefaultState } from "./defaultState";
import { newLineSelectedState } from "./lines/lineSelectedState";
import { newSingleSelectedState } from "./singleSelectedState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { BoundingBox } from "../../boundingBox";
import { isLineLabelShape } from "../../../shapes/text";
import { newLineLabelSelectedState } from "./lines/lineLabelSelectedState";
import { newTreeRootSelectedState } from "./tree/treeRootSelectedState";
import { newTreeNodeSelectedState } from "./tree/treeNodeSelectedState";
import { newBoardEntitySelectedState } from "./board/boardEntitySelectedState";
import { newAlignBoxSelectedState } from "./align/alignBoxSelectedState";
import { newArrowSelectedState } from "./arrow/arrowSelectedState";
import { newArrowTwoSelectedState } from "./arrow/arrowTwoSelectedState";
import { newTrapezoidSelectedState } from "./trapezoid/trapezoidSelectedState";

interface Option {
  boundingBox?: BoundingBox;
}

export function newSelectionHubState(option?: Option): AppCanvasState {
  return {
    getLabel: () => "SelectionHub",
    onStart(ctx) {
      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      const count = selectedIds.length;
      if (count === 0) {
        return newDefaultState;
      } else if (count === 1) {
        const shape = ctx.getShapeComposite().shapeMap[selectedIds[0]];

        if (isLineLabelShape(shape)) {
          return newLineLabelSelectedState;
        }

        switch (shape.type) {
          case "line":
            return newLineSelectedState;
          case "one_sided_arrow":
            return newArrowSelectedState;
          case "two_sided_arrow":
            return newArrowTwoSelectedState;
          case "trapezoid":
            return newTrapezoidSelectedState;
          case "tree_root":
            return newTreeRootSelectedState;
          case "tree_node":
            return newTreeNodeSelectedState;
          case "board_root":
          case "board_column":
          case "board_lane":
          case "board_card":
            return newBoardEntitySelectedState;
          case "align_box":
            return newAlignBoxSelectedState;
          default:
            return newSingleSelectedState;
        }
      } else {
        return option?.boundingBox
          ? () => newMultipleSelectedState({ boundingBox: option.boundingBox })
          : newMultipleSelectedState;
      }
    },
    handleEvent() {},
  };
}
