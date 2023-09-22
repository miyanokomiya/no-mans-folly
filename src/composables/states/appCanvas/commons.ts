import { HistoryEvent } from "../commons";
import { ChangeStateEvent, KeyDownEvent, TransitionValue } from "../core";
import { newDroppingNewShapeState } from "./droppingNewShapeState";
import { AppCanvasStateContext, TextStyleEvent } from "./core";
import { newLineReadyState } from "./lines/lineReadyState";
import { DocDelta, DocOutput } from "../../../models/document";
import {
  calcOriginalDocSize,
  getDeltaByApplyBlockStyleToDoc,
  getDeltaByApplyDocStyle,
  getDeltaByApplyInlineStyleToDoc,
} from "../../../utils/textEditor";
import { canHaveText, getWrapperRect, getWrapperRectForShapes } from "../../../shapes";
import { newTextEditingState } from "./text/textEditingState";
import { IVec2 } from "okageo";
import { StringItem, newClipboard, newClipboardSerializer } from "../../clipboard";
import { Shape } from "../../../models";
import * as geometry from "../../../utils/geometry";
import { newTextReadyState } from "./text/textReadyState";
import { TextShape, isTextShape, patchSize } from "../../../shapes/text";
import { newSelectionHubState } from "./selectionHubState";
import { getAllBranchIds, getTree } from "../../../utils/tree";
import { newShapeRenderer } from "../../shapeRenderer";
import { newImageBuilder } from "../../imageBuilder";
import { toMap } from "../../../utils/commons";

type AcceptableEvent = "Break" | "DroppingNewShape" | "LineReady" | "TextReady";

export function handleStateEvent(
  _ctx: Pick<AppCanvasStateContext, "getSelectedShapeIdMap" | "getShapeMap">,
  event: ChangeStateEvent,
  acceptable: AcceptableEvent[]
): TransitionValue<AppCanvasStateContext> {
  const name = event.data.name;
  if (!acceptable.includes(name as AcceptableEvent)) return;

  if (event.data.name === "Break") {
    return newSelectionHubState;
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
      return newSelectionHubState;
    }
    case "z":
      if (event.data.ctrl) ctx.undo();
      return newSelectionHubState;
    case "Z":
      if (event.data.ctrl) ctx.redo();
      return newSelectionHubState;
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
      const shapeMap = ctx.getShapeMap();
      // Collect all related shape ids
      const targetIds = getAllBranchIds(getTree(Object.values(shapeMap)), Object.keys(ctx.getSelectedShapeIdMap()));

      const docMap = ctx.getDocumentMap();
      const shapes = targetIds.map((id) => shapeMap[id]).filter((s) => !!s);
      const docs: [string, DocOutput][] = targetIds.filter((id) => !!docMap[id]).map((id) => [id, docMap[id]]);

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

export async function copyShapesAsPNG(ctx: AppCanvasStateContext): Promise<void> {
  const shapeMap = ctx.getShapeMap();
  const selected = ctx.getSelectedShapeIdMap();
  const targetIds = getAllBranchIds(getTree(ctx.getShapes()), Object.keys(selected));
  const targetShapes = targetIds.map((id) => shapeMap[id]);

  const renderer = newShapeRenderer({
    getShapeIds: () => targetIds,
    getShapeMap: () => toMap(targetShapes),
    getTmpShapeMap: () => ({}),
    getDocumentMap: ctx.getDocumentMap,
    getShapeStruct: ctx.getShapeStruct,
  });

  const range = getWrapperRectForShapes(ctx.getShapeStruct, targetShapes, true);
  const builder = newImageBuilder({ render: renderer.render, range });
  try {
    const blob = await builder.toBlob();
    const item = new ClipboardItem({ "image/png": blob });
    navigator.clipboard.write([item]);
    ctx.showToastMessage({
      text: "Copied to clipboard",
      type: "info",
    });
  } catch (e) {
    ctx.showToastMessage({
      text: "Failed to create image",
      type: "error",
    });
    console.error(e);
  }
}
