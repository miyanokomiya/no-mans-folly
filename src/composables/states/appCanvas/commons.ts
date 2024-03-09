import { HistoryEvent, newPanningReadyState } from "../commons";
import { ChangeStateEvent, KeyDownEvent, PointerDownEvent, TransitionValue, WheelEvent } from "../core";
import { newDroppingNewShapeState } from "./droppingNewShapeState";
import { AppCanvasState, AppCanvasStateContext, FileDropEvent, TextStyleEvent } from "./core";
import { newLineReadyState } from "./lines/lineReadyState";
import { DocDelta, DocOutput } from "../../../models/document";
import {
  calcOriginalDocSize,
  getDeltaByApplyBlockStyleToDoc,
  getDeltaByApplyDocStyle,
  getDeltaByApplyInlineStyleToDoc,
} from "../../../utils/textEditor";
import {
  canHaveText,
  createShape,
  patchShapesOrderToLast,
  resizeOnTextEdit,
  shouldResizeOnTextEdit,
} from "../../../shapes";
import { newTextEditingState } from "./text/textEditingState";
import { IVec2, add, getRectCenter, multi } from "okageo";
import { StringItem, newClipboard, newClipboardSerializer } from "../../clipboard";
import { Shape } from "../../../models";
import * as geometry from "../../../utils/geometry";
import { newTextReadyState } from "./text/textReadyState";
import { TextShape } from "../../../shapes/text";
import { newSelectionHubState } from "./selectionHubState";
import { getAllBranchIds, getTree } from "../../../utils/tree";
import { ImageShape } from "../../../shapes/image";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { mapFilter, mapReduce } from "../../../utils/commons";
import { isGroupShape } from "../../../shapes/group";
import { newEmojiPickerState } from "./emojiPickerState";
import { canGroupShapes, findBetterShapeAt } from "../../shapeComposite";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { newMovingHubState } from "./movingHubState";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { ShapeSelectionScope } from "../../../shapes/core";
import { CommandExam } from "../types";
import { handleContextItemEvent } from "./contextMenuItems";
import { newAutoPanningState } from "../autoPanningState";
import { newShapeInspectionState } from "./shapeInspectionState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";

type AcceptableEvent = "Break" | "DroppingNewShape" | "LineReady" | "TextReady" | "ShapeInspection";

export function handleStateEvent(
  _ctx: unknown,
  event: ChangeStateEvent,
  acceptable: AcceptableEvent[],
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

  if (event.data.name === "ShapeInspection") {
    return () => newShapeInspectionState();
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
  event: KeyDownEvent,
): TransitionValue<AppCanvasStateContext> {
  switch (event.data.key) {
    case "a": {
      event.data.prevent?.();
      const shapeComposite = ctx.getShapeComposite();
      const rootShapeIds = shapeComposite.mergedShapeTree.map((t) => t.id);
      const selectedMap = ctx.getSelectedShapeIdMap();
      if (rootShapeIds.every((id) => selectedMap[id])) {
        ctx.clearAllSelected();
      } else {
        ctx.multiSelectShapes(rootShapeIds);
      }
      return newSelectionHubState;
    }
    case "p": {
      if (!event.data.ctrl) {
        const shapeComposite = ctx.getShapeComposite();
        const current = shapeComposite.shapeMap[ctx.getLastSelectedShapeId() ?? ""];
        if (current?.parentId && shapeComposite.shapeMap[current.parentId]) {
          ctx.selectShape(current.parentId);
          return newSelectionHubState;
        }
      }
      return;
    }
    case "c": {
      if (!event.data.ctrl) {
        const shapeComposite = ctx.getShapeComposite();
        const currentNode = shapeComposite.mergedShapeTreeMap[ctx.getLastSelectedShapeId() ?? ""];
        if (currentNode && currentNode.children.length > 0 && shapeComposite.shapeMap[currentNode.children[0].id]) {
          ctx.selectShape(currentNode.children[0].id);
          return newSelectionHubState;
        }
      }
      return;
    }
    case "g":
      if (event.data.ctrl) {
        event.data.prevent?.();

        const shapeComposite = ctx.getShapeComposite();
        const targetIds = Object.keys(ctx.getSelectedShapeIdMap());
        if (!canGroupShapes(shapeComposite, targetIds)) return;

        const group = createShape(shapeComposite.getShapeStruct, "group", { id: ctx.generateUuid() });
        ctx.addShapes(
          [group],
          undefined,
          mapReduce(ctx.getSelectedShapeIdMap(), () => ({ parentId: group.id })),
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
          () => ({ parentId: undefined }),
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
    case ";":
    case ":":
      if (event.data.ctrl) {
        event.data.prevent?.();
        return newEmojiPickerState;
      }
      return;
    case " ": {
      return { type: "stack-restart", getState: newPanningReadyState };
    }
    case "!":
    case "Home": {
      const shapeComposite = ctx.getShapeComposite();
      const rects = shapeComposite.shapes.map((s) => shapeComposite.getWrapperRect(s));
      if (rects.length === 0) return;

      const viewRect = geometry.getWrapperRect(rects);
      return { type: "stack-resume", getState: () => newAutoPanningState({ viewRect, duration: 100 }) };
    }
    case "Delete":
    case "Backspace": {
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      if (ids.length > 0) {
        ctx.deleteShapes(ids);
      }
      return;
    }
  }
}

const COMMON_COMMAND_EXAMS = [
  COMMAND_EXAM_SRC.NEW_TEXT,
  COMMAND_EXAM_SRC.NEW_LINE,
  COMMAND_EXAM_SRC.NEW_EMOJI,
  COMMAND_EXAM_SRC.TOGGLE_GRID,
  COMMAND_EXAM_SRC.PAN_CANVAS,
  COMMAND_EXAM_SRC.RESET_VIEWPORT,
];
export function getCommonCommandExams(ctx: AppCanvasStateContext): CommandExam[] {
  const shapeComposite = ctx.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;
  const current = shapeMap[ctx.getLastSelectedShapeId() ?? ""];
  if (!current) return COMMON_COMMAND_EXAMS;

  const extra: CommandExam[] = [];
  if (shapeComposite.shapeMap[current.parentId ?? ""]) {
    extra.push(COMMAND_EXAM_SRC.SELECT_PARENT);
  }
  const currentNode = shapeComposite.mergedShapeTreeMap[current.id];
  if (currentNode.children.length > 0 && shapeMap[currentNode.children[0].id]) {
    extra.push(COMMAND_EXAM_SRC.SELECT_CHILD);
  }

  const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
  if (canGroupShapes(shapeComposite, selectedIds)) {
    extra.push(COMMAND_EXAM_SRC.GROUP);
  }
  if (selectedIds.some((id) => shapeMap[id] && isGroupShape(shapeMap[id]))) {
    extra.push(COMMAND_EXAM_SRC.UNGROUP);
  }

  return extra.length > 0 ? [...extra, ...COMMON_COMMAND_EXAMS] : COMMON_COMMAND_EXAMS;
}

export function handleCommonTextStyle(
  ctx: AppCanvasStateContext,
  event: TextStyleEvent,
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

  const shapeComposite = ctx.getShapeComposite();
  let patchMap: { [id: string]: Partial<TextShape> } = {};
  const renderCtx = ctx.getRenderCtx();
  if (renderCtx) {
    const shapeMap = shapeComposite.shapeMap;
    Object.entries(patch).forEach(([id, p]) => {
      const shape = shapeMap[id];
      const resizeOnTextEditInfo = shouldResizeOnTextEdit(shapeComposite.getShapeStruct, shape);
      if (resizeOnTextEditInfo?.maxWidth) {
        const patched = ctx.patchDocDryRun(id, p);
        const size = calcOriginalDocSize(patched, renderCtx, resizeOnTextEditInfo.maxWidth);
        const update = resizeOnTextEdit(shapeComposite.getShapeStruct, shape, size);
        if (update) {
          patchMap[id] = update;
        }
      }
    });
  }

  patchMap = getPatchByLayouts(shapeComposite, { update: patchMap });

  if (event.data.draft) {
    ctx.setTmpDocMap(patch);
    ctx.setTmpShapeMap(patchMap);
  } else {
    ctx.setTmpDocMap({});
    ctx.setTmpShapeMap({});
    ctx.patchDocuments(patch, patchMap);
  }
}

export function startTextEditingIfPossible(
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">,
  selectedId?: string,
  point?: IVec2,
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
    },
  );
}

const APP_DOC_TYPE = "application/no-mans-folly-doc";
const clipboardDocSerializer = newClipboardSerializer<"doc", { doc: DocOutput }>("doc");
export function newDocClipboard(doc: DocOutput, onPaste?: (doc: DocOutput, plain: boolean) => void) {
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
        onPaste?.(restored.doc, false);
        return;
      }

      const item = items.find((i) => i.kind === "string") as StringItem | undefined;
      if (!item) return;

      const text: any = await item.getAsString();
      onPaste?.([{ insert: text }], true);
    },
  );
}

export async function handleFileDrop(ctx: AppCanvasStateContext, event: FileDropEvent): Promise<void> {
  const assetAPI = ctx.assetAPI;
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

export function handleCommonPointerDownLeftOnSingleSelection(
  ctx: AppCanvasStateContext,
  event: PointerDownEvent,
  selectedId: string,
  selectionScope?: ShapeSelectionScope,
  excludeIds?: string[],
): TransitionValue<AppCanvasStateContext> {
  const shapeComposite = ctx.getShapeComposite();
  const shapeAtPointer = findBetterShapeAt(
    shapeComposite,
    event.data.point,
    selectionScope,
    excludeIds,
    ctx.getScale(),
  );
  if (!shapeAtPointer) {
    return () => newPointerDownEmptyState(event.data.options);
  }

  if (!event.data.options.ctrl) {
    if (event.data.options.alt) {
      ctx.selectShape(shapeAtPointer.id);
      return newDuplicatingShapesState;
    } else if (shapeAtPointer.id === selectedId) {
      return newMovingHubState;
    } else {
      ctx.selectShape(shapeAtPointer.id, false);
      return newSingleSelectedByPointerOnState;
    }
  }

  ctx.selectShape(shapeAtPointer.id, true);
  return;
}

export function handleCommonPointerDownRightOnSingleSelection(
  ctx: AppCanvasStateContext,
  event: PointerDownEvent,
  selectedId: string,
  selectionScope?: ShapeSelectionScope,
  excludeIds?: string[],
): TransitionValue<AppCanvasStateContext> {
  const shapeComposite = ctx.getShapeComposite();
  const shapeAtPointer = findBetterShapeAt(
    shapeComposite,
    event.data.point,
    selectionScope,
    excludeIds,
    ctx.getScale(),
  );
  if (!shapeAtPointer || shapeAtPointer.id === selectedId) return;

  ctx.selectShape(shapeAtPointer.id, event.data.options.ctrl);
  return;
}

/**
 * Procs zooming or panning depending on the user setting.
 * Returns the latest scale.
 */
export function handleCommonWheel(
  ctx: Pick<AppCanvasStateContext, "getUserSetting" | "scrollView" | "zoomView" | "getScale">,
  event: WheelEvent,
): number {
  if (!!event.data.options.ctrl !== (ctx.getUserSetting().wheelAction === "pan")) {
    ctx.scrollView(event.data.options.shift ? { x: event.data.delta.y, y: event.data.delta.x } : event.data.delta);
    return ctx.getScale();
  }

  return ctx.zoomView(event.data.delta.y);
}

export const handleIntransientEvent: AppCanvasState["handleEvent"] = (ctx, event) => {
  switch (event.type) {
    case "wheel":
      handleCommonWheel(ctx, event);
      return;
    case "keydown":
      return handleCommonShortcut(ctx, event);
    case "selection": {
      return newSelectionHubState;
    }
    case "text-style": {
      return handleCommonTextStyle(ctx, event);
    }
    case "shape-updated": {
      if (Object.keys(ctx.getSelectedShapeIdMap()).some((id) => event.data.keys.has(id))) {
        return newSelectionHubState;
      }
      return;
    }
    case "history":
      handleHistoryEvent(ctx, event);
      return newSelectionHubState;
    case "state":
      return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady", "TextReady", "ShapeInspection"]);
    case "contextmenu-item": {
      return handleContextItemEvent(ctx, event);
    }
    case "copy": {
      const clipboard = newShapeClipboard(ctx);
      clipboard.onCopy(event.nativeEvent);
      return;
    }
    case "paste": {
      const clipboard = newShapeClipboard(ctx);
      clipboard.onPaste(event.nativeEvent);
      return;
    }
    case "file-drop": {
      handleFileDrop(ctx, event);
      return;
    }
    default:
      return;
  }
};

export function panViewToShape(
  ctx: Pick<AppCanvasStateContext, "panView" | "getViewRect" | "getScale" | "getShapeComposite">,
  shapeId: string,
) {
  const shapeComposite = ctx.getShapeComposite();
  const shape = shapeComposite.mergedShapeMap[shapeId];
  if (!shape) return;

  const viewRect = ctx.getViewRect();
  ctx.panView({
    start: getRectCenter(viewRect),
    current: shape.p,
    scale: ctx.getScale(),
  });
}
