import { HistoryEvent } from "../commons";
import { ChangeStateEvent, KeyDownEvent, TransitionValue } from "../core";
import { newDroppingNewShapeState } from "./droppingNewShapeState";
import { AppCanvasStateContext, TextStyleEvent } from "./core";
import { newDefaultState } from "./defaultState";
import { newMultipleSelectedState } from "./multipleSelectedState";
import { newSingleSelectedState } from "./singleSelectedState";
import { BoundingBox } from "../../boundingBox";
import { newLineReadyState } from "./lines/lineReadyState";
import { newLineSelectedState } from "./lines/lineSelectedState";
import { DocDelta } from "../../../models/document";
import {
  getDeltaByApplyBlockStyleToDoc,
  getDeltaByApplyDocStyle,
  getDeltaByApplyInlineStyle,
} from "../../../utils/textEditor";
import { canHaveText } from "../../../shapes";
import { newTextEditingState } from "./text/textEditingState";

export function translateOnSelection(
  ctx: Pick<AppCanvasStateContext, "getSelectedShapeIdMap" | "getShapeMap">,
  boundingBox?: BoundingBox
): TransitionValue<AppCanvasStateContext> {
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
        return boundingBox ? () => newSingleSelectedState({ boundingBox }) : newSingleSelectedState;
    }
  } else {
    return boundingBox ? () => newMultipleSelectedState({ boundingBox }) : newMultipleSelectedState;
  }
}

type AcceptableEvent = "Break" | "DroppingNewShape" | "LineReady";

export function handleStateEvent(
  ctx: Pick<AppCanvasStateContext, "getSelectedShapeIdMap" | "getShapeMap">,
  event: ChangeStateEvent,
  acceptable: AcceptableEvent[]
): TransitionValue<AppCanvasStateContext> {
  const name = event.data.name;
  if (!acceptable.includes(name as AcceptableEvent)) return;

  if (event.data.name === "Break") {
    return translateOnSelection(ctx);
  }

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

export function handleCommonShortcut(
  ctx: AppCanvasStateContext,
  event: KeyDownEvent
): TransitionValue<AppCanvasStateContext> {
  switch (event.data.key) {
    case "z":
      if (event.data.ctrl) ctx.undo();
      return translateOnSelection(ctx);
    case "Z":
      if (event.data.ctrl) ctx.redo();
      return translateOnSelection(ctx);
  }
}

export function handleCommonTextStyle(
  ctx: AppCanvasStateContext,
  event: TextStyleEvent
): TransitionValue<AppCanvasStateContext> {
  const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
  if (selectedIds.length === 0) return;

  const patch = selectedIds.reduce<{ [id: string]: DocDelta }>((m, id) => {
    const doc = ctx.getDocumentMap()[id] ?? [];
    if (event.data.doc) {
      m[id] = getDeltaByApplyDocStyle(doc, event.data.value);
    } else if (event.data.block) {
      m[id] = getDeltaByApplyBlockStyleToDoc(doc, event.data.value);
    } else {
      m[id] = getDeltaByApplyInlineStyle(doc, event.data.value);
    }
    return m;
  }, {});

  ctx.patchDocuments(patch);
}

export function startTextEditingIfPossible(
  ctx: Pick<AppCanvasStateContext, "getShapeMap" | "getShapeStruct">,
  selectedId?: string
): TransitionValue<AppCanvasStateContext> {
  const shape = ctx.getShapeMap()[selectedId ?? ""];
  if (shape && canHaveText(ctx.getShapeStruct, shape)) {
    return () => newTextEditingState({ id: selectedId! });
  }
}
