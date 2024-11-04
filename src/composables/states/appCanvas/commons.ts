import { handleCommonWheel, HistoryEvent } from "../commons";
import { newPanningReadyState } from "../panningReadyState";
import { ChangeStateEvent, KeyDownEvent, PointerDownEvent, TransitionValue } from "../core";
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
import { newTextReadyState } from "./text/textReadyState";
import { TextShape } from "../../../shapes/text";
import { getAllBranchIds, getTree } from "../../../utils/tree";
import { ImageShape } from "../../../shapes/image";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { isGroupShape } from "../../../shapes/group";
import { newEmojiPickerState } from "./emojiPickerState";
import { canGroupShapes, findBetterShapeAt, getAllShapeRangeWithinComposite } from "../../shapeComposite";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { ShapeSelectionScope } from "../../../shapes/core";
import { CommandExam } from "../types";
import { groupShapes, handleContextItemEvent, ungroupShapes } from "./contextMenuItems";
import { newAutoPanningState } from "../autoPanningState";
import { newShapeInspectionState } from "./shapeInspectionState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";
import { newRactangleSelectingReadyState } from "./ractangleSelectingReadyState";
import { FOLLY_SVG_PREFIX, ShapeTemplateInfo, parseTemplateShapes } from "../../../shapes/utils/shapeTemplateUtil";
import { Shape } from "../../../models";
import { newPanToShapeState } from "./panToShapeState";
import { isFollySheetFileName } from "../../../utils/fileAccess";
import { loadShapesFromSheetFile } from "../../workspaceFile";
import { createNewTextShapeForDocument } from "./utils/text";
import { duplicateShapes } from "../../../shapes/utils/duplicator";

type AcceptableEvent =
  | "Break"
  | "DroppingNewShape"
  | "LineReady"
  | "TextReady"
  | "RectSelectReady"
  | "ShapeInspection"
  | "PanToShape";

export function getCommonAcceptableEvents(excludes: AcceptableEvent[] = []): AcceptableEvent[] {
  const ex = new Set(excludes);
  const list: AcceptableEvent[] = [
    "Break",
    "DroppingNewShape",
    "LineReady",
    "TextReady",
    "RectSelectReady",
    "ShapeInspection",
    "PanToShape",
  ];
  return list.filter((s) => !ex.has(s));
}

export function handleStateEvent(
  ctx: Pick<AppCanvasStateContext, "states">,
  event: ChangeStateEvent,
  acceptable: AcceptableEvent[],
): TransitionValue<AppCanvasStateContext> {
  const name = event.data.name;
  if (!acceptable.includes(name as AcceptableEvent)) return;

  switch (event.data.name) {
    case "Break":
      return ctx.states.newSelectionHubState;
    case "DroppingNewShape":
      return () => newDroppingNewShapeState(event.data.options);
    case "LineReady":
      return () => newLineReadyState(event.data.options);
    case "TextReady":
      return () => newTextReadyState();
    case "RectSelectReady":
      return () => newRactangleSelectingReadyState();
    case "ShapeInspection":
      return () => newShapeInspectionState();
    case "PanToShape":
      return () => newPanToShapeState(event.data.options);
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
  // Note: On Mac, letters are always lowered when command key is held.
  // => "switch case" should be case insensitive, then check "shift" key inside the block.
  switch (event.data.key) {
    case "a":
    case "A": {
      if (event.data.shift) return;

      event.data.prevent?.();
      const shapeComposite = ctx.getShapeComposite();
      const rootShapeIds = shapeComposite.mergedShapeTree.map((t) => t.id);
      const selectedMap = ctx.getSelectedShapeIdMap();
      if (rootShapeIds.every((id) => selectedMap[id])) {
        ctx.clearAllSelected();
      } else {
        ctx.multiSelectShapes(rootShapeIds);
      }
      return ctx.states.newSelectionHubState;
    }
    case "p":
    case "P": {
      if (event.data.shift) return;
      if (event.data.ctrl) return;

      ctx.patchUserSetting({ preview: ctx.getUserSetting().preview === "on" ? "off" : "on" });
      return;
    }
    case "g":
    case "G":
      if (event.data.ctrl) {
        event.data.prevent?.();

        if (event.data.shift) {
          const ungrouped = ungroupShapes(ctx);
          return ungrouped ? ctx.states.newSelectionHubState : undefined;
        } else {
          const grouped = groupShapes(ctx);
          return grouped ? ctx.states.newSelectionHubState : undefined;
        }
      } else {
        if (event.data.shift) return;
        ctx.patchUserSetting({ grid: ctx.getGrid().disabled ? "on" : "off" });
      }
      return ctx.states.newSelectionHubState;
    case "l":
    case "L":
      if (event.data.shift) return;
      return () => newLineReadyState({ type: undefined });
    case "t":
    case "T":
      if (event.data.shift) return;
      return () => newTextReadyState();
    case "z":
    case "Z":
      if (event.data.ctrl) {
        event.data.prevent?.();

        if (event.data.shift) {
          ctx.redo();
        } else {
          ctx.undo();
        }
      }
      return ctx.states.newSelectionHubState;
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
      event.data.prevent?.();
      const shapeComposite = ctx.getShapeComposite();
      if (shapeComposite.shapes.length === 0) return;

      const rect = getAllShapeRangeWithinComposite(shapeComposite, true);
      return { type: "stack-resume", getState: () => newAutoPanningState({ viewRect: rect, duration: 100 }) };
    }
    case "Delete":
    case "Backspace": {
      event.data.prevent?.();
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
  COMMAND_EXAM_SRC.TOGGLE_PREVIEW,
  COMMAND_EXAM_SRC.PAN_CANVAS,
  COMMAND_EXAM_SRC.RESET_VIEWPORT,
];
export function getCommonCommandExams(ctx: AppCanvasStateContext): CommandExam[] {
  const shapeComposite = ctx.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;
  const current = shapeMap[ctx.getLastSelectedShapeId() ?? ""];
  if (!current) return COMMON_COMMAND_EXAMS;

  const extra: CommandExam[] = [];
  const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
  if (selectedIds.length === 1 && shapeComposite.attached(shapeMap[selectedIds[0]])) {
    extra.push(COMMAND_EXAM_SRC.SLIDE_ATTACH_ANCHOR);
  }
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

const clipboardShapeSerializer = newClipboardSerializer<"shapes", ShapeTemplateInfo>("shapes");
export function newShapeClipboard(ctx: AppCanvasStateContext) {
  function pasteTextAsShape(text: string) {
    const delta: DocOutput = [{ insert: text }, { insert: "\n" }];
    const shape = createNewTextShapeForDocument(ctx, delta);
    ctx.pasteShapes([shape], [[shape.id, delta]]);
  }

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
      const textItem = items.find((i) => i.kind === "string") as StringItem | undefined;
      if (textItem) {
        const text: any = await textItem.getAsString();
        let restored: ShapeTemplateInfo | undefined;
        try {
          restored = clipboardShapeSerializer.deserialize(text);
        } catch {
          // This text is just plain one
          pasteTextAsShape(text);
          return;
        }

        if (restored && restored.shapes.length > 0) {
          ctx.pasteShapes(restored.shapes, restored.docs);
        }
        return;
      }

      const fileItems = items.filter((i) => i.kind === "file");
      if (fileItems.length > 0) {
        const fileList: File[] = [];
        try {
          await Promise.all(
            fileItems.map(async (item) => {
              const file = await item.getAsFile();
              fileList.push(file);
            }),
          );
        } catch (e) {
          ctx.showToastMessage({ text: "Failed to read files.", type: "error" });
          console.error(e);
          return;
        }

        handleFileImport(ctx, fileList, ctx.getCursorPoint());
        return;
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
  return handleFileImport(ctx, event.data.files, event.data.point);
}

async function handleFileImport(ctx: AppCanvasStateContext, files: FileList | File[], point: IVec2): Promise<void> {
  const follySvgFiles: File[] = [];
  const assetFiles: File[] = [];
  const sheetFiles: File[] = [];

  for (const file of files) {
    const loweredName = file.name.toLowerCase();

    if (isFollySheetFileName(loweredName)) {
      sheetFiles.push(file);
    } else if (loweredName.endsWith(FOLLY_SVG_PREFIX)) {
      follySvgFiles.push(file);
    } else if (/image\/.+/.test(file.type)) {
      assetFiles.push(file);
    }
  }

  if (sheetFiles.length === 0 && follySvgFiles.length === 0 && assetFiles.length === 0) {
    ctx.showToastMessage({ text: "No available data fround in files.", type: "warn" });
    return;
  }

  if (sheetFiles.length > 0) {
    await loadFollySheetFiles(ctx, sheetFiles, point);
  }

  if (follySvgFiles.length > 0) {
    await loadFollySvgFiles(ctx, follySvgFiles, point);
  }

  if (assetFiles.length === 0) {
    return;
  }

  const assetAPI = ctx.assetAPI;
  if (!assetAPI.enabled) {
    ctx.showToastMessage({ text: "Sync workspace to enable asset files.", type: "error" });
    return;
  }

  const imageStore = ctx.getImageStore();

  const assetMap = new Map<string, HTMLImageElement>();
  for (const file of assetFiles) {
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
      p: add(point, multi(drift, i)),
      width: img?.width,
      height: img?.height,
      ...patch[id],
    });
  });
  ctx.addShapes(shapes);
}

async function loadFollySvgFiles(ctx: AppCanvasStateContext, follySvgFiles: File[], point: IVec2) {
  const templates: ShapeTemplateInfo[] = [];

  for (const file of follySvgFiles) {
    const svgText = await file.text();
    const data = parseTemplateShapes(svgText);
    if (data) {
      templates.push(data);
    }
  }

  await pasteShapeTemplateInfoList(ctx, templates, point);
}

async function loadFollySheetFiles(ctx: AppCanvasStateContext, follySheetFiles: File[], point: IVec2) {
  const templates: ShapeTemplateInfo[] = [];

  for (const file of follySheetFiles) {
    const data = await loadShapesFromSheetFile(file);
    if (data) {
      templates.push(data);
    }
  }

  await pasteShapeTemplateInfoList(ctx, templates, point);
}

async function pasteShapeTemplateInfoList(ctx: AppCanvasStateContext, templates: ShapeTemplateInfo[], point: IVec2) {
  const newShapes: Shape[] = [];
  const newDocMap: { [key: string]: DocOutput } = {};
  const lastIndex = ctx.createLastIndex();
  const drift = { x: 20, y: 20 };
  let position = point;
  for (const data of templates) {
    if (data && data.shapes.length > 0) {
      const duplicated = duplicateShapes(
        ctx.getShapeStruct,
        data.shapes,
        data.docs,
        ctx.generateUuid,
        lastIndex, // This is just a temprorary value and adjusted later.
        new Set(),
        position,
      );
      duplicated.shapes.forEach((s) => {
        newShapes.push(s);
      });
      Object.entries(duplicated.docMap).forEach(([id, doc]) => {
        newDocMap[id] = doc;
      });
      position = add(position, drift);
    }
  }

  if (newShapes.length > 0) {
    const ids = newShapes.map((s) => s.id);
    const patch = patchShapesOrderToLast(ids, ctx.createLastIndex());
    const adjustedNewShapes = newShapes.map((s) => {
      return { ...s, ...patch[s.id] };
    });
    ctx.addShapes(adjustedNewShapes, newDocMap);
    // Select root shapes
    ctx.multiSelectShapes(adjustedNewShapes.filter((s) => !s.parentId).map((s) => s.id));
  }

  const imageStore = ctx.getImageStore();
  const assetMap = new Map<string, Blob>();
  templates.forEach((t) => {
    t.assets?.forEach(([id, blob]) => {
      if (imageStore.getImage(id)) return;
      assetMap.set(id, blob);
    });
  });
  if (assetMap.size === 0) return;

  if (!ctx.assetAPI.enabled) {
    ctx.showToastMessage({ text: "Sync workspace to enable asset files.", type: "error" });
    return;
  }

  const saved: [string, Blob][] = [];
  for (const [id, blob] of assetMap) {
    try {
      await ctx.assetAPI.saveAsset(id, blob);
      saved.push([id, blob]);
    } catch (e) {
      console.error(e);
      ctx.showToastMessage({ text: "Failed to save asset file.", type: "error" });
    }
  }

  // Try to load asset files.
  // Show warning when something goes wrong, but keep going.
  for (const [id, blob] of saved) {
    try {
      await imageStore.loadFromFile(id, blob);
    } catch (e) {
      console.error(e);
      ctx.showToastMessage({ text: "Failed to load asset files.", type: "warn" });
    }
  }
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
      return () => newSingleSelectedByPointerOnState({ concurrent: true });
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

export const handleIntransientEvent: AppCanvasState["handleEvent"] = (ctx, event) => {
  switch (event.type) {
    case "pointerdoubleclick": {
      const shapeComposite = ctx.getShapeComposite();
      const shape = shapeComposite.findShapeAt(event.data.point, undefined, undefined, undefined, ctx.getScale());
      if (shape) {
        return startTextEditingIfPossible(ctx, shape.id, event.data.point);
      }
      return;
    }
    case "wheel":
      handleCommonWheel(ctx, event);
      return;
    case "keydown":
      return handleCommonShortcut(ctx, event);
    case "selection": {
      return ctx.states.newSelectionHubState;
    }
    case "text-style": {
      return handleCommonTextStyle(ctx, event);
    }
    case "shape-updated": {
      if (Object.keys(ctx.getSelectedShapeIdMap()).some((id) => event.data.keys.has(id))) {
        return ctx.states.newSelectionHubState;
      }
      return;
    }
    case "history":
      handleHistoryEvent(ctx, event);
      return ctx.states.newSelectionHubState;
    case "state":
      return handleStateEvent(ctx, event, [
        "DroppingNewShape",
        "LineReady",
        "TextReady",
        "RectSelectReady",
        "ShapeInspection",
        "PanToShape",
      ]);
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

export function selectShapesInRange(
  ctx: Pick<AppCanvasStateContext, "getLastSelectedShapeId" | "multiSelectShapes" | "getShapeComposite">,
  targetId: string,
) {
  const lastId = ctx.getLastSelectedShapeId();
  if (!lastId) {
    ctx.multiSelectShapes([targetId], true);
    return;
  }

  const shapeComposite = ctx.getShapeComposite();
  const lastSelected = shapeComposite.shapeMap[lastId];
  const siblings =
    shapeComposite.mergedShapeTreeMap[lastSelected.parentId ?? ""]?.children ?? shapeComposite.mergedShapeTree;
  const siblingIds = siblings.map((s) => s.id);
  const lastIndex = siblingIds.findIndex((id) => id === lastSelected.id);
  const targetIndex = siblingIds.findIndex((id) => id === targetId);
  if (targetIndex === -1) return;

  if (lastIndex < targetIndex) {
    const ids = siblingIds.slice(lastIndex, targetIndex);
    ids.push(targetId);
    ctx.multiSelectShapes(ids, true);
  } else if (targetIndex < lastIndex) {
    const ids = siblingIds.slice(targetIndex + 1, lastIndex + 1);
    ids.push(targetId);
    ctx.multiSelectShapes(ids, true);
  }
}
