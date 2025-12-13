import { Shape } from "../../../models";
import { createShape, getOutlinePaths, resizeOnTextEdit, shouldResizeOnTextEdit } from "../../../shapes";
import { isGroupShape } from "../../../shapes/group";
import { groupBy, mapReduce, splitList, toMap } from "../../../utils/commons";
import { mergeEntityPatchInfo, normalizeEntityPatchInfo } from "../../../utils/entities";
import { FOLLY_SVG_PREFIX } from "../../../shapes/utils/shapeTemplateUtil";
import { ImageBuilder, newImageBuilder, newSVGImageBuilder, SVGImageBuilder } from "../../imageBuilder";
import { canGroupShapes, newShapeComposite, ShapeComposite } from "../../shapeComposite";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { newShapeRenderer } from "../../shapeRenderer";
import { TransitionValue } from "../core";
import { ContextMenuItem, ContextMenuSeparatorItem } from "../types";
import { AppCanvasStateContext, ContextMenuItemEvent } from "./core";
import { AffineMatrix, IRectangle } from "okageo";
import { duplicateShapes } from "../../../shapes/utils/duplicator";
import { i18n } from "../../../i18n";
import { saveFileInWeb, getExportParamsForSelectedShapes, getExportParamsForSelectedRange } from "../../shapeExport";
import { newShapeSVGRenderer } from "../../shapeSVGRenderer";
import iconRefinement from "../../../assets/icons/refinement.svg";
import iconVnNode from "../../../assets/icons/vnnode.svg";
import iconDustbinRed from "../../../assets/icons/dustbin_red.svg";
import { RectPolygonShape } from "../../../shapes/rectPolygon";
import { expandRect } from "../../../utils/geometry";
import { LineShape } from "../../../shapes/line";
import { generateKeyBetweenAllowSame } from "../../../utils/findex";
import { ImageShape, isImageAssetShape } from "../../../shapes/image";
import { parseSvgFile } from "../../../shapes/utils/svgParser";
import { DocOutput } from "../../../models/document";
import { calcOriginalDocSize, getInitialOutput } from "../../../utils/textEditor";
import { newColorParser } from "../../colorParser";
import { generateFindexAfter } from "../../shapeRelation";
import { canJoinAlignBox } from "../../alignHandler";
import { AlignBoxShape } from "../../../shapes/align/alignBox";
import { isSymbolShape, SymbolShape } from "../../../shapes/symbol";
import { generateSymbolAssetId, getAssetIdSrcStr } from "../../../shapes/utils/symbol";
import { getSlideOverlayPosition } from "./commons";
import { getAttachmentOption, getPatchByDetachFromShape } from "../../shapeAttachmentHandler";

export const CONTEXT_MENU_ITEM_SRC = {
  get GRID_ON() {
    return {
      label: i18n.t("contextmenu.grid_on"),
      key: "GRID_ON",
    };
  },
  get GRID_OFF() {
    return {
      label: i18n.t("contextmenu.grid_off"),
      key: "GRID_OFF",
    };
  },
  get PREVIEW_ON() {
    return {
      label: i18n.t("contextmenu.preview_on"),
      key: "PREVIEW_ON",
    };
  },
  get PREVIEW_OFF() {
    return {
      label: i18n.t("contextmenu.preview_off"),
      key: "PREVIEW_OFF",
    };
  },
  get DELETE_SHAPE() {
    return {
      label: i18n.t("contextmenu.delete"),
      key: "DELETE_SHAPE",
      icon: iconDustbinRed,
    };
  },
  get DUPLICATE_SHAPE() {
    return {
      label: i18n.t("contextmenu.duplicate"),
      key: "DUPLICATE_SHAPE",
    };
  },
  get DUPLICATE_SHAPE_WITHIN_GROUP() {
    return {
      label: i18n.t("contextmenu.duplicate.withingroup"),
      key: "DUPLICATE_SHAPE_WITHIN_GROUP",
    };
  },
  get DUPLICATE_AS_PATH() {
    return {
      label: i18n.t("contextmenu.duplicate_as_path"),
      key: "DUPLICATE_AS_PATH",
    };
  },
  get PIN_TO_SHAPE() {
    return {
      label: i18n.t("contextmenu.pin_to_shape"),
      key: "PIN_TO_SHAPE",
    };
  },
  get UNPIN_FROM_SHAPE() {
    return {
      label: i18n.t("contextmenu.unpin_from_shape"),
      key: "UNPIN_FROM_SHAPE",
    };
  },
  get GROUP() {
    return {
      label: i18n.t("contextmenu.group"),
      key: "GROUP",
    };
  },
  get UNGROUP() {
    return {
      label: i18n.t("contextmenu.ungroup"),
      key: "UNGROUP",
    };
  },
  get CREATE_SYMBOL() {
    return {
      label: i18n.t("contextmenu.create_symbol"),
      key: "CREATE_SYMBOL",
    };
  },
  get UPDATE_SYMBOL() {
    return {
      label: i18n.t("contextmenu.update_symbol"),
      key: "CREATE_SYMBOL",
    };
  },
  get ALIGN_LAYOUT() {
    return {
      label: i18n.t("contextmenu.align_layout"),
      key: "ALIGN_LAYOUT",
    };
  },
  get DISSOLVE_LAYOUT() {
    return {
      label: i18n.t("contextmenu.dissolve_layout"),
      key: "DISSOLVE_LAYOUT",
    };
  },
  get CREATE_FRAME() {
    return {
      label: i18n.t("contextmenu.create_frame"),
      key: "CREATE_FRAME",
    };
  },
  get LOCK() {
    return {
      label: i18n.t("contextmenu.lock"),
      key: "LOCK",
    };
  },
  get UNLOCK() {
    return {
      label: i18n.t("contextmenu.unlock"),
      key: "UNLOCK",
    };
  },
  // Note: "COPY_AS_SVZG" doesn't work because Clipboard API doesn't go with "image/svg+xml"
  get COPY_AS_PNG() {
    return {
      label: i18n.t("contextmenu.copy.png"),
      key: "COPY_AS_PNG",
    };
  },
  get EXPORT_SELECTED_SHAPES() {
    return {
      label: i18n.t("contextmenu.export.shapes.as"),
      key: "EXPORT_SELECTED_SHAPES",
      children: [
        {
          label: i18n.t("contextmenu.export.png"),
          key: "EXPORT_AS_PNG",
        },
        {
          label: i18n.t("contextmenu.export.svg"),
          key: "EXPORT_AS_SVG",
        },
        {
          label: i18n.t("contextmenu.export.follysvg"),
          key: "EXPORT_AS_FOLLY_SVG",
        },
      ],
    };
  },
  get EXPORT_SELECTED_RANGE() {
    return {
      label: i18n.t("contextmenu.export.range.as"),
      key: "EXPORT_SELECTED_RANGE",
      children: [
        {
          label: i18n.t("contextmenu.export.png"),
          key: "EXPORT_RANGE_AS_PNG",
        },
        {
          label: i18n.t("contextmenu.export.svg"),
          key: "EXPORT_RANGE_AS_SVG",
        },
      ],
    };
  },

  get PARSE_SVG() {
    return {
      label: i18n.t("contextmenu.import.parsesvg"),
      key: "PARSE_SVG",
    };
  },

  get FLIP_LINE_H() {
    return {
      label: i18n.t("contextmenu.flip.h"),
      key: "FLIP_LINE_H",
    };
  },
  get FLIP_LINE_V() {
    return {
      label: i18n.t("contextmenu.flip.v"),
      key: "FLIP_LINE_V",
    };
  },
  get DELETE_LINE_VERTEX() {
    return {
      label: i18n.t("contextmenu.vertex.delete"),
      key: "DELETE_LINE_VERTEX",
    };
  },
  get DETACH_LINE_VERTEX() {
    return {
      label: i18n.t("contextmenu.vertex.detach"),
      key: "DETACH_LINE_VERTEX",
    };
  },
  get DETACH_LINE_VERTICES() {
    return {
      label: i18n.t("contextmenu.vertex.detach.all"),
      key: "DETACH_LINE_VERTICES",
    };
  },
  get ATTACH_LINE_VERTEX() {
    return {
      label: i18n.t("contextmenu.vertex.attach"),
      key: "ATTACH_LINE_VERTEX",
    };
  },
  get ATTACH_LINE_VERTICES() {
    return {
      label: i18n.t("contextmenu.vertex.attach.all"),
      key: "ATTACH_LINE_VERTICES",
    };
  },
  get REFINE_SEGMENT() {
    return {
      label: i18n.t("contextmenu.segment.refine"),
      key: "REFINE_SEGMENT",
      icon: iconRefinement,
    };
  },
  get COMBINE_LINES() {
    return {
      label: i18n.t("contextmenu.line.combine"),
      key: "COMBINE_LINES",
    };
  },
  get CREATE_VN_NODE() {
    return {
      label: i18n.t("contextmenu.vertex.vnnode.create"),
      key: "CREATE_VN_NODE",
      icon: iconVnNode,
    };
  },
  get INSERT_VN_NODE() {
    return {
      label: i18n.t("contextmenu.vertex.vnnode.insert"),
      key: "INSERT_VN_NODE",
      icon: iconVnNode,
    };
  },
  get SPLIT_BY_VN_NODE() {
    return {
      label: i18n.t("contextmenu.vertex.vnnode.split"),
      key: "SPLIT_BY_VN_NODE",
      icon: iconVnNode,
    };
  },

  SEPARATOR: { separator: true },
} satisfies { [key: string]: ContextMenuItem };

export function isContextSeparatorItem(item: ContextMenuItem): item is ContextMenuSeparatorItem {
  return "separator" in item;
}

export function isSameContextItem(a: ContextMenuItem, b: ContextMenuItem): boolean {
  const isSeparatorA = isContextSeparatorItem(a);
  const isSeparatorB = isContextSeparatorItem(b);
  if (isSeparatorA && isSeparatorB) return true;
  if (!isSeparatorA && !isSeparatorB) return a.key === b.key;
  return false;
}

export function getMenuItemsForSelectedShapes(
  ctx: Pick<AppCanvasStateContext, "getSelectedShapeIdMap" | "getShapeComposite">,
): ContextMenuItem[] {
  const ids = Object.keys(ctx.getSelectedShapeIdMap());
  if (ids.length === 0) return [];

  const shapeComposite = ctx.getShapeComposite();
  const shapes = ids.map((id) => shapeComposite.shapeMap[id]);
  const [unlocked, locked] = splitList(shapes, (s) => !s.locked);
  const unlockedIds = unlocked.map((s) => s.id);

  const topItems: ContextMenuItem[] = [];

  switch (getAttachmentOption(shapeComposite, unlockedIds)) {
    case "attach":
      topItems.push(CONTEXT_MENU_ITEM_SRC.PIN_TO_SHAPE);
      break;
    case "detach":
      topItems.push(CONTEXT_MENU_ITEM_SRC.UNPIN_FROM_SHAPE);
      break;
  }

  if (unlocked.length > 0) {
    topItems.push(CONTEXT_MENU_ITEM_SRC.LOCK);
  }
  if (locked.length > 0) {
    topItems.push(CONTEXT_MENU_ITEM_SRC.UNLOCK);
  }
  if (topItems.length > 0) {
    topItems.push(CONTEXT_MENU_ITEM_SRC.SEPARATOR);
  }

  return [
    ...topItems,
    CONTEXT_MENU_ITEM_SRC.CREATE_SYMBOL,
    CONTEXT_MENU_ITEM_SRC.DUPLICATE_SHAPE,
    ...(shapes[0].parentId ? [CONTEXT_MENU_ITEM_SRC.DUPLICATE_SHAPE_WITHIN_GROUP] : []),
    CONTEXT_MENU_ITEM_SRC.DUPLICATE_AS_PATH,
    CONTEXT_MENU_ITEM_SRC.SEPARATOR,
    ...(shapes.some((s) => isSvgImageShape(s)) ? [CONTEXT_MENU_ITEM_SRC.PARSE_SVG] : []),
    CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG,
    CONTEXT_MENU_ITEM_SRC.EXPORT_SELECTED_SHAPES,
    CONTEXT_MENU_ITEM_SRC.EXPORT_SELECTED_RANGE,
    CONTEXT_MENU_ITEM_SRC.SEPARATOR,
    CONTEXT_MENU_ITEM_SRC.DELETE_SHAPE,
  ];
}

export function handleContextItemEvent(
  ctx: AppCanvasStateContext,
  event: ContextMenuItemEvent,
): TransitionValue<AppCanvasStateContext> {
  ctx.setContextMenuList();
  switch (event.data.key) {
    case CONTEXT_MENU_ITEM_SRC.GRID_ON.key: {
      ctx.patchUserSetting({ grid: "on" });
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.GRID_OFF.key: {
      ctx.patchUserSetting({ grid: "off" });
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.PREVIEW_ON.key: {
      ctx.patchUserSetting({ preview: "on" });
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.PREVIEW_OFF.key: {
      ctx.patchUserSetting({ preview: "off" });
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.DELETE_SHAPE.key: {
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      if (ids.length > 0) {
        ctx.deleteShapes(ids);
      }
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.DUPLICATE_SHAPE.key: {
      duplicateSelectedShapes(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.DUPLICATE_SHAPE_WITHIN_GROUP.key: {
      duplicateSelectedShapes(ctx, true);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.DUPLICATE_AS_PATH.key: {
      duplicateSelectedShapesAsPaths(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.PIN_TO_SHAPE.key: {
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      return () => ctx.states.newShapeAttachingState({ targetIds: ids });
    }
    case CONTEXT_MENU_ITEM_SRC.UNPIN_FROM_SHAPE.key: {
      detachFromShape(ctx);
      return ctx.states.newSelectionHubState;
    }
    case CONTEXT_MENU_ITEM_SRC.GROUP.key: {
      groupShapes(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.UNGROUP.key: {
      ungroupShapes(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.CREATE_SYMBOL.key: {
      createSymbolForShapes(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.ALIGN_LAYOUT.key: {
      createAlignBox(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.CREATE_FRAME.key: {
      createFrameForShapes(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.LOCK.key: {
      lockShapes(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.UNLOCK.key: {
      unlockShapes(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.PARSE_SVG.key: {
      parseSvgFileFromShapes(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG.key:
      copyShapesAsPNG(ctx);
      return;
    case "EXPORT_AS_PNG":
      exportShapesAsPNG(ctx);
      return;
    case "EXPORT_AS_SVG":
      exportShapesAsSVG(ctx);
      return;
    case "EXPORT_AS_FOLLY_SVG":
      exportShapesAsSVG(ctx, true);
      return;
    case "EXPORT_RANGE_AS_PNG":
      exportRangeAsPNG(ctx);
      return;
    case "EXPORT_RANGE_AS_SVG":
      exportRangeAsSVG(ctx);
      return;
  }
}

async function copyShapesAsPNG(ctx: AppCanvasStateContext): Promise<void> {
  const builder = getImageBuilderForSelectedShapes(ctx);
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

function exportShapesAsPNG(ctx: AppCanvasStateContext) {
  if (!ctx.getLastSelectedShapeId()) {
    ctx.showToastMessage({
      text: "No shape is selected",
      type: "error",
    });
    return;
  }
  exportAsPNG(ctx, getImageBuilderForSelectedShapes(ctx));
}

function exportRangeAsPNG(ctx: AppCanvasStateContext) {
  if (!ctx.getLastSelectedShapeId()) {
    ctx.showToastMessage({
      text: "No shape is selected",
      type: "error",
    });
    return;
  }
  exportAsPNG(ctx, getImageBuilderForSelectedRange(ctx));
}

function exportAsPNG(ctx: AppCanvasStateContext, builder: ImageBuilder) {
  try {
    saveFileInWeb(builder.toDataURL(), `${generateShapeFileName()}.png`);
  } catch (e) {
    ctx.showToastMessage({
      text: "Failed to create image",
      type: "error",
    });
    console.error(e);
  }
}

function getImageBuilderForSelectedShapes(ctx: AppCanvasStateContext) {
  const info = getExportParamsForSelectedShapes(ctx.getShapeComposite(), Object.keys(ctx.getSelectedShapeIdMap()));
  return getImageBuilderForShapesWithRange(ctx, info.targetShapeComposite, info.range);
}

function getImageBuilderForSelectedRange(ctx: AppCanvasStateContext) {
  const info = getExportParamsForSelectedRange(ctx.getShapeComposite(), Object.keys(ctx.getSelectedShapeIdMap()));
  return getImageBuilderForShapesWithRange(ctx, info.targetShapeComposite, info.range);
}

function getSVGBuilderForShapes(ctx: AppCanvasStateContext, withMeta = false) {
  const info = getExportParamsForSelectedShapes(
    ctx.getShapeComposite(),
    Object.keys(ctx.getSelectedShapeIdMap()),
    withMeta,
  );
  return getSVGBuilderForShapesWithRange(ctx, info.targetShapeComposite, info.range, withMeta);
}

function getSVGBuilderForRange(ctx: AppCanvasStateContext, withMeta = false) {
  const info = getExportParamsForSelectedRange(
    ctx.getShapeComposite(),
    Object.keys(ctx.getSelectedShapeIdMap()),
    undefined,
    withMeta,
  );
  return getSVGBuilderForShapesWithRange(ctx, info.targetShapeComposite, info.range, withMeta);
}

function getSVGBuilderForShapesWithRange(
  ctx: AppCanvasStateContext,
  targetShapeComposite: ShapeComposite,
  range: IRectangle,
  withMeta = false,
) {
  const renderer = newShapeSVGRenderer({
    shapeComposite: targetShapeComposite,
    getDocumentMap: ctx.getDocumentMap,
    imageStore: ctx.getImageStore(),
    assetAPI: ctx.assetAPI,
  });
  return newSVGImageBuilder({ render: withMeta ? renderer.renderWithMeta : renderer.render, range });
}

function getImageBuilderForShapesWithRange(
  ctx: AppCanvasStateContext,
  targetShapeComposite: ShapeComposite,
  range: IRectangle,
) {
  const renderer = newShapeRenderer({
    shapeComposite: targetShapeComposite,
    getDocumentMap: ctx.getDocumentMap,
    imageStore: ctx.getImageStore(),
  });

  return newImageBuilder({ render: renderer.render, range });
}

async function exportShapesAsSVG(ctx: AppCanvasStateContext, withMeta = false): Promise<void> {
  if (!ctx.getLastSelectedShapeId()) {
    ctx.showToastMessage({
      text: "No shape is selected",
      type: "error",
    });
    return;
  }

  await exportAsSVG(
    ctx,
    getSVGBuilderForShapes(ctx, withMeta),
    withMeta ? `${generateShapeFileName()}${FOLLY_SVG_PREFIX}` : `${generateShapeFileName()}.svg`,
  );
}

async function exportRangeAsSVG(ctx: AppCanvasStateContext): Promise<void> {
  if (!ctx.getLastSelectedShapeId()) {
    ctx.showToastMessage({
      text: "No shape is selected",
      type: "error",
    });
    return;
  }

  await exportAsSVG(ctx, getSVGBuilderForRange(ctx), `${generateShapeFileName()}.svg`);
}

export async function exportAsSVG(ctx: AppCanvasStateContext, builder: SVGImageBuilder, name: string): Promise<void> {
  try {
    await builder.toDataURL((dataURL) => {
      saveFileInWeb(dataURL, name);
    });
  } catch (e: any) {
    ctx.showToastMessage({
      text: `Failed to create image. ${e.message}`,
      type: "error",
    });
    console.error(e);
  }
}

function generateShapeFileName(): string {
  return `shapes_${Date.now()}`;
}

function detachFromShape(ctx: AppCanvasStateContext) {
  const shapeComposite = ctx.getShapeComposite();
  ctx.patchShapes(getPatchByDetachFromShape(shapeComposite, Object.keys(ctx.getSelectedShapeIdMap())));
}

export function groupShapes(ctx: AppCanvasStateContext): boolean {
  const shapeComposite = ctx.getShapeComposite();
  const targetIds = Object.keys(ctx.getSelectedShapeIdMap());
  if (targetIds.length === 0 || !canGroupShapes(shapeComposite, targetIds)) return false;

  const targets = targetIds.map((id) => shapeComposite.shapeMap[id]).filter((s) => !!s);
  const indexParentId = targets[0].parentId;
  const lastTarget = targets.reduce((a, b) => (a.findex < b.findex ? b : a), targets[0]);
  const group = createShape(shapeComposite.getShapeStruct, "group", {
    id: ctx.generateUuid(),
    parentId: indexParentId,
    // Set findex equivalent to the last target.
    findex: generateFindexAfter(shapeComposite, lastTarget.id),
  });
  ctx.addShapes(
    [group],
    undefined,
    mapReduce(ctx.getSelectedShapeIdMap(), () => ({ parentId: group.id })),
  );
  ctx.selectShape(group.id);
  return true;
}

export function ungroupShapes(ctx: AppCanvasStateContext): boolean {
  const ids = Object.keys(ctx.getSelectedShapeIdMap());
  const shapeComposite = ctx.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;
  const groups = ids.map((id) => shapeMap[id]).filter((s) => s && isGroupShape(s));
  if (groups.length === 0) return false;

  const patch = getPatchByDissolveShapes(shapeComposite, groups);
  ctx.deleteShapes(
    groups.map((s) => s.id),
    patch,
  );
  ctx.multiSelectShapes(Object.keys(patch));
  return true;
}

/**
 * Make sure if the targets can be dissolved before calling this.
 */
export function getPatchByDissolveShapes(
  shapeComposite: ShapeComposite,
  targets: Shape[],
): Record<string, Partial<Shape>> {
  // Child shapes should inherit the parentId of their parents if they have.
  const groupIdToParentIdMap = new Map(targets.map((s) => [s.id, s.parentId]));
  const childShapes = shapeComposite.shapes.filter((s) => s.parentId && groupIdToParentIdMap.has(s.parentId));
  const groupedByParentId = groupBy(childShapes, (s) => s.parentId!);

  const shapeMap = shapeComposite.shapeMap;
  const patch: Record<string, Partial<Shape>> = {};
  for (const [parentId, shapes] of Object.entries(groupedByParentId)) {
    const parent = shapeMap[parentId];
    const afterFindex = generateFindexAfter(shapeComposite, parentId);
    let findexFrom = parent.findex;
    shapes?.forEach((s) => {
      // Set findex equivalent to the parent.
      const findex = generateKeyBetweenAllowSame(findexFrom, afterFindex);
      patch[s.id] = { findex, parentId: groupIdToParentIdMap.get(parentId) };
      findexFrom = findex;
    });
  }
  return patch;
}

export function createAlignBox(ctx: AppCanvasStateContext): boolean {
  const shapeComposite = ctx.getShapeComposite();
  const targetIds = Object.keys(ctx.getSelectedShapeIdMap());
  const targets = targetIds
    .map((id) => shapeComposite.shapeMap[id])
    .filter((s) => s && canJoinAlignBox(shapeComposite, s));
  if (targets.length < 2) return false;

  const rect = shapeComposite.getWrapperRectForShapes(targets);
  const indexParentId = targets[0].parentId;
  const lastTarget = targets.reduce((a, b) => (a.findex < b.findex ? b : a), targets[0]);
  const layoutShape = createShape<AlignBoxShape>(shapeComposite.getShapeStruct, "align_box", {
    id: ctx.generateUuid(),
    parentId: indexParentId,
    // Set findex equivalent to the last target.
    findex: generateFindexAfter(shapeComposite, lastTarget.id),
    p: { x: rect.x, y: rect.y },
    baseWidth: undefined,
    baseHeight: undefined,
  });
  ctx.updateShapes({
    add: [layoutShape],
    update: mapReduce(ctx.getSelectedShapeIdMap(), () => ({ parentId: layoutShape.id })),
  });
  ctx.selectShape(layoutShape.id);
  return true;
}

/**
 * Default margin doesn't have much meaning here. It's just to make the frame look a bit better.
 */
async function createSymbolForShapes(ctx: AppCanvasStateContext): Promise<boolean> {
  const targetIds = Object.keys(ctx.getSelectedShapeIdMap());
  const shapeComposite = ctx.getShapeComposite();
  if (targetIds.length === 0) return false;

  const assetId = await createSymbolAsset(ctx, targetIds);
  if (!assetId) return false;

  const rect = shapeComposite.getWrapperRectForShapes(
    targetIds.map((id) => shapeComposite.shapeMap[id]),
    true,
  );
  const symbol = createShape<SymbolShape>(shapeComposite.getShapeStruct, "symbol", {
    id: ctx.generateUuid(),
    p: getSlideOverlayPosition(ctx, rect),
    src: targetIds,
    assetId,
  });
  ctx.addShapes([symbol]);
  ctx.selectShape(symbol.id);
  return true;
}

export async function createSymbolAsset(ctx: AppCanvasStateContext, targetIds: string[]): Promise<string | undefined> {
  if (targetIds.length === 0) return;

  try {
    const assetId = await generateSymbolAssetId(targetIds);
    const info = getExportParamsForSelectedShapes(ctx.getShapeComposite(), targetIds);
    const builder = getSVGBuilderForShapesWithRange(ctx, info.targetShapeComposite, info.range);
    const blob = await builder.toBlob();
    await ctx.assetAPI.saveAsset(assetId, blob);
    await ctx.getImageStore().loadFromFile(assetId, blob);
    return assetId;
  } catch (e) {
    ctx.showToastMessage({
      text: "Failed to create symbol",
      type: "error",
    });
    console.error(e);
    return;
  }
}

export async function updateSymbolAssetIdBySrc(ctx: AppCanvasStateContext, src: string[]): Promise<void> {
  if (src.length === 0) return;

  const srcStr = getAssetIdSrcStr(src);
  const assetId = await generateSymbolAssetId(src);
  const symbolShapes = ctx.getShapeComposite().shapes.filter((s) => isSymbolShape(s));
  const targetSymbols = symbolShapes.filter((s) => srcStr === getAssetIdSrcStr(s.src) && s.assetId !== assetId);
  if (targetSymbols.length === 0) return;

  ctx.patchShapes(mapReduce(toMap(targetSymbols), () => ({ assetId }) as Partial<SymbolShape>));
}

/**
 * Default margin doesn't have much meaning here. It's just to make the frame look a bit better.
 */
export function createFrameForShapes(ctx: AppCanvasStateContext, margin = 10): boolean {
  const shapeComposite = ctx.getShapeComposite();
  const targetIds = Object.keys(ctx.getSelectedShapeIdMap());
  if (targetIds.length === 0 || !canGroupShapes(shapeComposite, targetIds)) return false;

  const rect = expandRect(
    shapeComposite.getWrapperRectForShapes(
      targetIds.map((id) => shapeComposite.shapeMap[id]),
      true,
    ),
    margin,
  );
  const frame = createShape<RectPolygonShape>(shapeComposite.getShapeStruct, "frame", {
    id: ctx.generateUuid(),
    p: { x: rect.x, y: rect.y },
    width: rect.width,
    height: rect.height,
  });
  ctx.addShapes([frame]);
  ctx.selectShape(frame.id);
  return true;
}

export function lockShapes(ctx: AppCanvasStateContext): boolean {
  const targetIds = Object.keys(ctx.getSelectedShapeIdMap());
  if (targetIds.length === 0) return false;

  const patch = targetIds.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
    p[id] = { locked: true };
    return p;
  }, {});
  ctx.patchShapes(patch);
  return true;
}

export function unlockShapes(ctx: AppCanvasStateContext): boolean {
  const targetIds = Object.keys(ctx.getSelectedShapeIdMap());
  if (targetIds.length === 0) return false;

  const patch = targetIds.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
    p[id] = { locked: false };
    return p;
  }, {});
  ctx.patchShapes(patch);
  return true;
}

function duplicateSelectedShapes(ctx: AppCanvasStateContext, withinGroup = false) {
  const ids = Object.keys(ctx.getSelectedShapeIdMap());
  if (ids.length === 0) return;

  const shapeComposite = ctx.getShapeComposite();
  const srcShapes = shapeComposite.getAllBranchMergedShapes(ids);
  const docMap = ctx.getDocumentMap();
  const srcBounds = shapeComposite.getWrapperRectForShapes(srcShapes);
  const duplicated = duplicateShapes(
    ctx.getShapeStruct,
    srcShapes,
    srcShapes.filter(({ id }) => !!docMap[id]).map(({ id }) => [id, docMap[id]]),
    ctx.generateUuid,
    ctx.createLastIndex(),
    new Set(Object.keys(shapeComposite.shapeMap)),
    getSlideOverlayPosition(ctx, srcBounds),
    withinGroup,
  );

  const entityPatch = normalizeEntityPatchInfo(
    mergeEntityPatchInfo(
      { add: duplicated.shapes },
      { update: getPatchByLayouts(shapeComposite, { add: duplicated.shapes }) },
    ),
  );

  ctx.addShapes(entityPatch.add ?? [], duplicated.docMap, entityPatch.update);
  ctx.multiSelectShapes(duplicated.shapes.map((s) => s.id));
}

function duplicateSelectedShapesAsPaths(ctx: AppCanvasStateContext) {
  const ids = Object.keys(ctx.getSelectedShapeIdMap());
  if (ids.length === 0) return;

  const shapeComposite = ctx.getShapeComposite();
  const srcShapes = shapeComposite.getAllBranchMergedShapes(ids);

  const shapes: Shape[] = [];
  let findexFrom = ctx.createLastIndex();
  srcShapes.forEach((s) => {
    getOutlinePaths(shapeComposite.getShapeStruct, s)?.forEach((path) => {
      if (path.path.length < 2) return;

      const findex = generateKeyBetweenAllowSame(findexFrom, null);
      findexFrom = findex;
      const line = createShape<LineShape>(shapeComposite.getShapeStruct, "line", {
        id: ctx.generateUuid(),
        findex,
        p: path.path[0],
        body: path.path.length > 2 ? path.path.slice(1, -1).map((p) => ({ p })) : undefined,
        q: path.path[path.path.length - 1],
        curves: path.curves.length > 0 ? path.curves : undefined,
      });
      shapes.push(line);
    });
  });

  ctx.addShapes(shapes);
  ctx.multiSelectShapes(shapes.map((s) => s.id));
}

function isSvgImageShape(shape: Shape): shape is ImageShape & { assetId: string } {
  return isImageAssetShape(shape) && !!shape.assetId?.toLowerCase().endsWith(".svg");
}

async function parseSvgFileFromShapes(ctx: AppCanvasStateContext): Promise<void> {
  const ids = Object.keys(ctx.getSelectedShapeIdMap());
  const assetAPI = ctx.assetAPI;
  const shapeComposite = ctx.getShapeComposite();
  const imageShapes = ids.map((id) => shapeComposite.shapeMap[id]).filter((s) => s && isSvgImageShape(s));
  const colorParser = newColorParser();
  const newShapes: Shape[] = [];
  const newDocMap: Record<string, DocOutput> = {};

  let findexFrom = ctx.createLastIndex();
  for (const imageShape of imageShapes) {
    const data = await assetAPI.loadAsset(imageShape.assetId);
    if (!data) continue;

    const [shapes, textMap] = await parseSvgFile(data, {
      generateId: ctx.generateUuid,
      getRenderingColor: colorParser.parseColor,
    });

    const newShapesByImage: Shape[] = [];
    shapes.forEach((shape) => {
      const text = textMap.get(shape.id);
      let patchForDoc: Partial<Shape> | undefined;
      if (text) {
        const doc = [{ insert: text }, ...getInitialOutput({ direction: "top", align: "left" })];
        newDocMap[shape.id] = doc;
        // Adjust shape size based on text size.
        // This cannot reproduce the original size, but it's better than nothing.
        const renderCtx = ctx.getRenderCtx();
        const resizeOnTextEditInfo = shouldResizeOnTextEdit(shapeComposite.getShapeStruct, shape);
        if (renderCtx && resizeOnTextEditInfo?.maxWidth) {
          const size = calcOriginalDocSize(doc, renderCtx, resizeOnTextEditInfo.maxWidth);
          patchForDoc = resizeOnTextEdit(shapeComposite.getShapeStruct, shape, size);
        }
      }

      const findex = generateKeyBetweenAllowSame(findexFrom, null);
      newShapesByImage.push({ ...shape, ...patchForDoc, findex });
      findexFrom = findex;
    });

    // Adjust position of new shapes to be below each original image.
    const imageRect = shapeComposite.getWrapperRect(imageShape);
    const scForNewShapes = newShapeComposite({ getStruct: ctx.getShapeStruct, shapes: newShapesByImage });
    const newRect = scForNewShapes.getWrapperRectForShapes(newShapesByImage);
    const affine: AffineMatrix = [1, 0, 0, 1, imageRect.x - newRect.x, imageRect.y - newRect.y + imageRect.height + 20];
    newShapesByImage.forEach((s) => {
      newShapes.push({ ...s, ...scForNewShapes.transformShape(s, affine) });
    });
  }
  if (newShapes.length === 0)
    return ctx.showToastMessage({ text: i18n.t("contextmenu.import.parsesvg.noshape"), type: "warn" });

  ctx.addShapes(newShapes, newDocMap);
  // Select root shapes of new shapes.
  const scForNewShapes = newShapeComposite({ getStruct: ctx.getShapeStruct, shapes: newShapes });
  ctx.multiSelectShapes(scForNewShapes.mergedShapeTree.map((t) => t.id));
}
