import { TransitionValue } from "../core";
import { AppCanvasStateContext } from "./core";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { newSingleSelectedState } from "./singleSelectedState";

export function translateOnSelection(ctx: AppCanvasStateContext): TransitionValue<AppCanvasStateContext> {
  const count = Object.keys(ctx.getSelectedShapeIdMap()).length;
  if (count === 0) {
    return newDefaultState;
  } else if (count === 1) {
    return newSingleSelectedState;
  } else {
    return newMultipleSelectedState;
  }
}
