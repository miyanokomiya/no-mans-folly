import type { AppCanvasState } from "./core";
import { newDefaultState } from "./defaultState";
import { newLineSelectedState } from "./lines/lineSelectedState";
import { newSingleSelectedState } from "./singleSelectedState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { BoundingBox } from "../../boundingBox";

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
        const shape = ctx.getShapeMap()[selectedIds[0]];
        switch (shape.type) {
          case "line":
            return newLineSelectedState;
          default:
            return option?.boundingBox
              ? () => newSingleSelectedState({ boundingBox: option.boundingBox })
              : newSingleSelectedState;
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
