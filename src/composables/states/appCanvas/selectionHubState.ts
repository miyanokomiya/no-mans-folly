import type { AppCanvasState } from "./core";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { BoundingBox } from "../../boundingBox";
import { newLineLabelSelectedState } from "./lines/lineLabelSelectedState";
import { getSingleShapeSelectedStateFn } from "../../shapeTypes";
import { isLineLabelShape } from "../../../utils/lineLabel";

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

        if (isLineLabelShape(shapeComposite, shape)) {
          return newLineLabelSelectedState;
        }

        return getSingleShapeSelectedStateFn(shape.type);
      } else {
        return option?.boundingBox
          ? () => newMultipleSelectedState({ boundingBox: option.boundingBox })
          : newMultipleSelectedState;
      }
    },
    handleEvent() {},
  };
}
export type NewSelectionHubState = typeof newSelectionHubState;
