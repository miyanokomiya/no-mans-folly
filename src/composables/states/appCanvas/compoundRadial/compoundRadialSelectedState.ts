import { CompoundRadialShape } from "../../../../shapes/compoundRadial";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { newDummyHandler } from "../../../shapeHandlers/core";

export const newCompoundRadialSelectedState = defineSingleSelectedHandlerState<CompoundRadialShape, any, never>(
  () => {
    return {
      getLabel: () => "CompoundRadialSelected",
      onStart: (ctx) => {
        ctx.showFloatMenu({ type: "compound_radial" });
      },
      handleEvent: () => {
        return;
      },
    };
  },
  () => newDummyHandler({}),
);
