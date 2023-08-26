import { HistoryEvent } from "../commons";
import { ChangeStateEvent, TransitionValue } from "../core";
import { newDroppingNewShapeState } from "./droppingNewShapeState";
import { AppCanvasStateContext } from "./core";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { newSingleSelectedState } from "./singleSelectedState";
import { BoundingBox } from "../../boundingBox";

export function translateOnSelection(
  ctx: Pick<AppCanvasStateContext, "getSelectedShapeIdMap">,
  boundingBox?: BoundingBox
): TransitionValue<AppCanvasStateContext> {
  const count = Object.keys(ctx.getSelectedShapeIdMap()).length;
  if (count === 0) {
    return newDefaultState;
  } else if (count === 1) {
    return boundingBox ? () => newSingleSelectedState({ boundingBox }) : newSingleSelectedState;
  } else {
    return boundingBox ? () => newMultipleSelectedState({ boundingBox }) : newMultipleSelectedState;
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

export function handleHistoryEvent(ctx: Pick<AppCanvasStateContext, "undo" | "redo">, event: HistoryEvent) {
  if (event.data === "redo") {
    ctx.redo();
  } else {
    ctx.undo();
  }
}
