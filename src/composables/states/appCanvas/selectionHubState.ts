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
import { newCylinderSelectedState } from "./cylinder/cylinderSelectedState";
import { newBubbleSelectedState } from "./bubble/bubbleSelectedState";
import { newDiagonalCrossSelectedState } from "./cross/diagonalCrossSelectedState";
import { newRoundedRectangleSelectedState } from "./roundedRectangle/roundedRectangleSelectedState";
import { newParallelogramSelectedState } from "./parallelogram/parallelogramSelectedState";
import { newDocumentSymbolSelectedState } from "./documentSymbol/documentSymbolSelectedState";
import { newWaveSelectedState } from "./wave/waveSelectedState";

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
        const shapeComposite = ctx.getShapeComposite();
        const shape = shapeComposite.shapeMap[selectedIds[0]];

        if (isLineLabelShape(shape) && shapeComposite.shapeMap[shape.parentId ?? ""]) {
          return newLineLabelSelectedState;
        }

        switch (shape.type) {
          case "line":
            return newLineSelectedState;
          case "rounded_rectangle":
            return newRoundedRectangleSelectedState;
          case "one_sided_arrow":
            return newArrowSelectedState;
          case "two_sided_arrow":
            return newArrowTwoSelectedState;
          case "trapezoid":
            return newTrapezoidSelectedState;
          case "document_symbol":
            return newDocumentSymbolSelectedState;
          case "wave":
            return newWaveSelectedState;
          case "parallelogram":
            return newParallelogramSelectedState;
          case "cross":
          case "diagonal_cross":
            return newDiagonalCrossSelectedState;
          case "cylinder":
            return newCylinderSelectedState;
          case "bubble":
            return newBubbleSelectedState;
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
