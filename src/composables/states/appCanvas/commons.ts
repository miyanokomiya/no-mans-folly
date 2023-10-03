import { HistoryEvent } from "../commons";
import { ChangeStateEvent, KeyDownEvent, TransitionValue } from "../core";
import { newDroppingNewShapeState } from "./droppingNewShapeState";
import { AppCanvasStateContext, FileDropEvent, TextStyleEvent } from "./core";
import { newLineReadyState } from "./lines/lineReadyState";
import { DocDelta, DocOutput } from "../../../models/document";
import {
  calcOriginalDocSize,
  getDeltaByApplyBlockStyleToDoc,
  getDeltaByApplyDocStyle,
  getDeltaByApplyInlineStyleToDoc,
} from "../../../utils/textEditor";
import { canHaveText, createShape, patchShapesOrderToLast } from "../../../shapes";
import { newTextEditingState } from "./text/textEditingState";
import { IVec2, add, multi } from "okageo";
import { StringItem, newClipboard, newClipboardSerializer } from "../../clipboard";
import { Shape } from "../../../models";
import * as geometry from "../../../utils/geometry";
import { newTextReadyState } from "./text/textReadyState";
import { TextShape, isTextShape, patchSize } from "../../../shapes/text";
import { newSelectionHubState } from "./selectionHubState";
import { getAllBranchIds, getTree } from "../../../utils/tree";
import { ImageShape } from "../../../shapes/image";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { mapFilter, mapReduce } from "../../../utils/commons";
import { isGroupShape } from "../../../shapes/group";

type AcceptableEvent = "Break" | "DroppingNewShape" | "LineReady" | "TextReady";

export function handleStateEvent(
  _ctx: unknown,
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
      const shapeMap = ctx.getShapeComposite().shapeMap;
      const allIds = Object.keys(shapeMap);
      if (Object.keys(ctx.getSelectedShapeIdMap()).length === allIds.length) {
        ctx.clearAllSelected();
      } else {
        ctx.multiSelectShapes(allIds);
      }
      return newSelectionHubState;
    }
    case "g":
      if (event.data.ctrl) {
        event.data.prevent?.();
        const ids = Object.keys(ctx.getSelectedShapeIdMap());
        if (ids.length < 1) return;

        const group = createShape(ctx.getShapeStruct, "group", { id: ctx.generateUuid() });
        ctx.addShapes(
          [group],
          undefined,
          mapReduce(ctx.getSelectedShapeIdMap(), () => ({ parentId: group.id }))
        );
        ctx.selectShape(group.id);
        return newSelectionHubState;
      } else {
        ctx.setGridDisabled(!ctx.getGrid().disabled);
      }
      return newSelectionHubState;
    case "G":
      if (event.data.ctrl) {
        event.data.prevent?.();
        const ids = Object.keys(ctx.getSelectedShapeIdMap());
        const shapeMap = ctx.getShapeComposite().shapeMap;
        const groups = ids.map((id) => shapeMap[id]).filter(isGroupShape);
        if (groups.length === 0) return;

        const groupIdSet = new Set(groups.map((s) => s.id));
        const patch = mapReduce(
          mapFilter(shapeMap, (s) => !!s.parentId && groupIdSet.has(s.parentId)),
          () => ({ parentId: undefined })
        );

        ctx.deleteShapes(Array.from(groupIdSet), patch);
        ctx.multiSelectShapes(Object.keys(patch));
        return newSelectionHubState;
      }
      return;
    case "l":
      if (event.data.ctrl) ctx.undo();
      return () => newLineReadyState({ type: undefined });
    case "t":
      if (event.data.ctrl) ctx.undo();
      return () => newTextReadyState();
    case "z":
      if (event.data.ctrl) ctx.undo();
      return newSelectionHubState;
    case "Z":
      if (event.data.ctrl) ctx.redo();
      return newSelectionHubState;
    case "!":
    case "Home": {
      const shapeComposite = ctx.getShapeComposite();
      ctx.setViewport(geometry.getWrapperRect(shapeComposite.shapes.map((s) => shapeComposite.getWrapperRect(s))), 80);
      return;
    }
  }
}

const COMMON_COMMAND_EXAMS = [
  COMMAND_EXAM_SRC.NEW_TEXT,
  COMMAND_EXAM_SRC.NEW_LINE,
  COMMAND_EXAM_SRC.TOGGLE_GRID,
  COMMAND_EXAM_SRC.RESET_VIEWPORT,
];
export function getCommonCommandExams() {
  return COMMON_COMMAND_EXAMS;
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
    const shapeMap = ctx.getShapeComposite().shapeMap;
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
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">,
  selectedId?: string,
  point?: IVec2
): TransitionValue<AppCanvasStateContext> {
  const composite = ctx.getShapeComposite();
  const shape = composite.shapeMap[selectedId ?? ""];
  if (shape && canHaveText(composite.getShapeStruct, shape)) {
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
      const shapeMap = ctx.getShapeComposite().shapeMap;
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

export async function handleFileDrop(ctx: AppCanvasStateContext, event: FileDropEvent): Promise<void> {
  const assetAPI = ctx.getAssetAPI();
  if (!assetAPI.enabled) {
    ctx.showToastMessage({ text: "Sync workspace to enable asset files.", type: "error" });
    return;
  }

  const imageStore = ctx.getImageStore();

  const assetMap = new Map<string, HTMLImageElement>();
  for (const file of event.data.files) {
    const splitted = file.name.split(".");
    const ex = splitted.length > 1 ? splitted[splitted.length - 1] : "";
    const str = ctx.generateUuid();
    const id = ex ? `${str}.${ex}` : str;
    try {
      await assetAPI.saveAsset(id, file);
      const img = await imageStore.loadFromFile(id, file);
      assetMap.set(id, img);
    } catch (e) {
      ctx.showToastMessage({ text: `Failed to import the file: ${file.name}`, type: "error" });
      console.error(e);
    }
  }

  const drift = { x: 20, y: 20 };
  const assetIds = Array.from(assetMap.keys());
  const ids = assetIds.map(() => ctx.generateUuid());
  const patch = patchShapesOrderToLast(ids, ctx.createLastIndex());
  const shapes = ids.map((id, i) => {
    const assetId = assetIds[i];
    const img = assetMap.get(assetId);
    return createShape<ImageShape>(ctx.getShapeStruct, "image", {
      id,
      assetId,
      p: add(event.data.point, multi(drift, i)),
      width: img?.width,
      height: img?.height,
      ...patch[id],
    });
  });
  ctx.addShapes(shapes);
}
