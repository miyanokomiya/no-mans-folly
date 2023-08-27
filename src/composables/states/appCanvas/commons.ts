import { HistoryEvent } from "../commons";
import { ChangeStateEvent, TransitionValue } from "../core";
import { newDroppingNewShapeState } from "./droppingNewShapeState";
import { AppCanvasStateContext } from "./core";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { newSingleSelectedState } from "./singleSelectedState";
import { BoundingBox } from "../../boundingBox";
import { newLineReadyState } from "./lines/lineReadyState";

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

type AcceptableEvent = "DroppingNewShape" | "LineReady";

export function handleStateEvent(event: ChangeStateEvent, acceptable: AcceptableEvent[]) {
  const name = event.data.name;
  if (!acceptable.includes(name as AcceptableEvent)) return;

  if (event.data.name === "DroppingNewShape") {
    return () => newDroppingNewShapeState(event.data.options);
  }

  if (event.data.name === "LineReady") {
    return () => newLineReadyState(event.data.options);
  }
}

export function handleHistoryEvent(ctx: Pick<AppCanvasStateContext, "undo" | "redo">, event: HistoryEvent) {
  if (event.data === "redo") {
    ctx.redo();
  } else {
    ctx.undo();
  }
}
