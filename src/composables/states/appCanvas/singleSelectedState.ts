import { defineSingleSelectedHandlerState } from "./singleSelectedHandlerState";

export const newSingleSelectedState = defineSingleSelectedHandlerState(() => {
  return {
    getLabel: () => "SingleSelected",
    handleEvent: () => {},
  };
});
