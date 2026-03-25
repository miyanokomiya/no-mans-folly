import { CompoundGridShape } from "../../../../shapes/compoundGrid";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { newDummyHandler } from "../../../shapeHandlers/core";

export const newCompoundGridSelectedState = defineSingleSelectedHandlerState<CompoundGridShape, any, never>(
  () => {
    return {
      getLabel: () => "CompoundGridSelected",
      onStart: (ctx) => {
        ctx.showFloatMenu({ type: "compound_grid" });
      },
      handleEvent: () => {
        return;
      },
    };
  },
  () => newDummyHandler({}),
);
