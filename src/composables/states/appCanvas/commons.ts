import { HistoryEvent } from "../commons";
import { ChangeStateEvent, TransitionValue } from "../core";
import { newDroppingNewShapeState } from "./DroppingNewShapeState";
import { AppCanvasStateContext } from "./core";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { newSingleSelectedState } from "./singleSelectedState";

export function translateOnSelection(
  ctx: Pick<AppCanvasStateContext, "getSelectedShapeIdMap">
): TransitionValue<AppCanvasStateContext> {
  const count = Object.keys(ctx.getSelectedShapeIdMap()).length;
  if (count === 0) {
    return newDefaultState;
  } else if (count === 1) {
    return newSingleSelectedState;
  } else {
    return newMultipleSelectedState;
  }
}

type AcceptableEvent = "DroppingNewShape";

export function handleStateEvent(event: ChangeStateEvent, acceptable: AcceptableEvent[]) {
  const name = event.data.name;
  if (!acceptable.includes(name as AcceptableEvent)) return;

  if (event.data.name === "DroppingNewShape") {
    return () => newDroppingNewShapeState(event.data.options);
  }
}

export function handleHistoryEvent(ctx: AppCanvasStateContext, event: HistoryEvent) {
  if (event.data === "redo") {
    ctx.redo();
  } else {
    ctx.undo();
  }
}
