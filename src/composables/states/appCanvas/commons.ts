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
import { DocDelta, DocOutput } from "../../../models/document";
import {
  calcOriginalDocSize,
  getDeltaByApplyBlockStyleToDoc,
  getDeltaByApplyDocStyle,
  getDeltaByApplyInlineStyleToDoc,
} from "../../../utils/textEditor";
import { canHaveText, getWrapperRect } from "../../../shapes";
import { newTextEditingState } from "./text/textEditingState";
import { IVec2 } from "okageo";
import { StringItem, newClipboard, newClipboardSerializer } from "../../clipboard";
import { Shape } from "../../../models";
import * as geometry from "../../../utils/geometry";
import { newTextReadyState } from "./text/textReadyState";
import { TextShape, isTextShape, patchSize } from "../../../shapes/text";

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

type AcceptableEvent = "Break" | "DroppingNewShape" | "LineReady" | "TextReady";

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

  if (event.data.name === "TextReady") {
    return () => newTextReadyState();
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
    case "a": {
      event.data.prevent?.();
      const allIds = Object.keys(ctx.getShapeMap());
      if (Object.keys(ctx.getSelectedShapeIdMap()).length === allIds.length) {
        ctx.clearAllSelected();
      } else {
        ctx.multiSelectShapes(allIds);
      }
      return translateOnSelection(ctx);
    }
    case "z":
      if (event.data.ctrl) ctx.undo();
      return translateOnSelection(ctx);
    case "Z":
      if (event.data.ctrl) ctx.redo();
      return translateOnSelection(ctx);
    case "!":
    case "Home":
      ctx.setViewport(
        geometry.getWrapperRect(Object.values(ctx.getShapeMap()).map((s) => getWrapperRect(ctx.getShapeStruct, s))),
        80
      );
      return;
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
      m[id] = getDeltaByApplyInlineStyleToDoc(doc, event.data.value);
    }
    return m;
  }, {});

  const shapePatch: { [id: string]: Partial<TextShape> } = {};
  const renderCtx = ctx.getRenderCtx();
  if (renderCtx) {
    const shapeMap = ctx.getShapeMap();
    Object.entries(patch).forEach(([id, p]) => {
      const shape = shapeMap[id];
      if (isTextShape(shape)) {
        const patched = ctx.patchDocDryRun(id, p);
        const size = calcOriginalDocSize(patched, renderCtx, shape.maxWidth);
        const update = patchSize(shape, size);
        if (update) {
          shapePatch[id] = update;
        }
      }
    });
  }

  ctx.patchDocuments(patch, shapePatch);
}

export function startTextEditingIfPossible(
  ctx: Pick<AppCanvasStateContext, "getShapeMap" | "getShapeStruct">,
  selectedId?: string,
  point?: IVec2
): TransitionValue<AppCanvasStateContext> {
  const shape = ctx.getShapeMap()[selectedId ?? ""];
  if (shape && canHaveText(ctx.getShapeStruct, shape)) {
    return () => newTextEditingState({ id: selectedId!, point });
  }
}

const clipboardShapeSerializer = newClipboardSerializer<
  "shapes",
  {
    shapes: Shape[];
    docs: [id: string, doc: DocOutput][];
  }
>("shapes");
export function newShapeClipboard(ctx: AppCanvasStateContext) {
  return newClipboard(
    () => {
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      const shapeMap = ctx.getShapeMap();
      const docMap = ctx.getDocumentMap();
      const shapes = ids.map((id) => shapeMap[id]).filter((s) => !!s);
      const docs: [string, DocOutput][] = ids.filter((id) => !!docMap[id]).map((id) => [id, docMap[id]]);

      return {
        "text/plain": clipboardShapeSerializer.serialize({ shapes, docs }),
      };
    },
    async (items) => {
      const item = items.find((i) => i.kind === "string") as StringItem | undefined;
      if (!item) return;

      const text: any = await item.getAsString();
      const restored = clipboardShapeSerializer.deserialize(text);

      if (restored.shapes.length > 0) {
        ctx.pasteShapes(restored.shapes, restored.docs);
      }
    }
  );
}

const APP_DOC_TYPE = "application/no-mans-folly-doc";
const clipboardDocSerializer = newClipboardSerializer<"doc", { doc: DocOutput }>("doc");
export function newDocClipboard(doc: DocOutput, onPaste?: (doc: DocOutput) => void) {
  return newClipboard(
    () => {
      return {
        "text/plain": doc.map((o) => o.insert).join(""),
        [APP_DOC_TYPE]: clipboardDocSerializer.serialize({ doc }),
      };
    },
    async (items) => {
      const appItem = items.find((i) => i.kind === "string" && i.type === APP_DOC_TYPE) as StringItem | undefined;
      if (appItem) {
        const text: any = await appItem.getAsString();
        const restored = clipboardDocSerializer.deserialize(text);
        onPaste?.(restored.doc);
        return;
      }

      const item = items.find((i) => i.kind === "string") as StringItem | undefined;
      if (!item) return;

      const text: any = await item.getAsString();
      onPaste?.([{ insert: text }]);
    }
  );
}
