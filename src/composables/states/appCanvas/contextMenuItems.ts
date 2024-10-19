import { Shape } from "../../../models";
import { createShape, duplicateShapes } from "../../../shapes";
import { isGroupShape } from "../../../shapes/group";
import { mapFilter, mapReduce, splitList } from "../../../utils/commons";
import { mergeEntityPatchInfo, normalizeEntityPatchInfo } from "../../../utils/entities";
import { FOLLY_SVG_PREFIX } from "../../../shapes/utils/shapeTemplateUtil";
import { ImageBuilder, newImageBuilder, newSVGImageBuilder, SVGImageBuilder } from "../../imageBuilder";
import {
  canGroupShapes,
  getAllShapeRangeWithinComposite,
  newShapeComposite,
  ShapeComposite,
} from "../../shapeComposite";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { newShapeRenderer } from "../../shapeRenderer";
import { newShapeSVGRenderer } from "../../shapeSVGRenderer";
import { TransitionValue } from "../core";
import { ContextMenuItem } from "../types";
import { AppCanvasStateContext, ContextMenuItemEvent } from "./core";
import { IRectangle } from "okageo";
import { getIntRectFromFloatRect } from "../../../utils/geometry";

export const CONTEXT_MENU_ITEM_SRC = {
  DELETE_SHAPE: {
    label: "Delete",
    key: "DELETE_SHAPE",
  },
  DUPLICATE_SHAPE: {
    label: "Duplicate",
    key: "DUPLICATE_SHAPE",
  },
  DUPLICATE_SHAPE_WITHIN_GROUP: {
    label: "Duplicate within group",
    key: "DUPLICATE_SHAPE_WITHIN_GROUP",
  },

  GROUP: {
    label: "Group",
    key: "GROUP",
  },
  UNGROUP: {
    label: "Ungroup",
    key: "UNGROUP",
  },

  LOCK: {
    label: "[[LOCK]]",
    key: "LOCK",
  },
  UNLOCK: {
    label: "Unlock",
    key: "UNLOCK",
  },

  // Note: "COPY_AS_SVZG" doesn't work because Clipboard API doesn't go with "image/svg+xml"
  COPY_AS_PNG: {
    label: "Copy as PNG",
    key: "COPY_AS_PNG",
  },
  EXPORT_SELECTED_SHAPES: {
    label: "Export selected shapes as",
    key: "EXPORT_SELECTED_SHAPES",
    children: [
      {
        label: "PNG",
        key: "EXPORT_AS_PNG",
      },
      {
        label: "SVG",
        key: "EXPORT_AS_SVG",
      },
      {
        label: "[[FOLLY_SVG]]",
        key: "EXPORT_AS_FOLLY_SVG",
      },
    ],
  },
  EXPORT_SELECTED_RANGE: {
    label: "Export selected range as",
    key: "EXPORT_SELECTED_RANGE",
    children: [
      {
        label: "PNG",
        key: "EXPORT_RANGE_AS_PNG",
      },
      {
        label: "SVG",
        key: "EXPORT_RANGE_AS_SVG",
      },
    ],
  },

  DELETE_LINE_VERTEX: {
    label: "Delete vertex",
    key: "DELETE_LINE_VERTEX",
  },
  DETACH_LINE_VERTEX: {
    label: "Detach vertex",
    key: "DETACH_LINE_VERTEX",
  },

  SEPARATOR: { separator: true },
} satisfies { [key: string]: ContextMenuItem };

const CONTEXT_MENU_COPY_SHAPE_ITEMS: ContextMenuItem[] = [
  CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG,
  CONTEXT_MENU_ITEM_SRC.EXPORT_SELECTED_SHAPES,
  CONTEXT_MENU_ITEM_SRC.EXPORT_SELECTED_RANGE,
];

export function getMenuItemsForSelectedShapes(
  ctx: Pick<AppCanvasStateContext, "getSelectedShapeIdMap" | "getShapeComposite">,
): ContextMenuItem[] {
  const ids = Object.keys(ctx.getSelectedShapeIdMap());
  if (ids.length === 0) return [];

  const shapeComposite = ctx.getShapeComposite();
  const shapes = ids.map((id) => shapeComposite.shapeMap[id]);
  const [unlocked, locked] = splitList(shapes, (s) => !s.locked);

  const lockItems: ContextMenuItem[] = [];

  if (unlocked.length > 0) {
    lockItems.push(CONTEXT_MENU_ITEM_SRC.LOCK);
  }
  if (locked.length > 0) {
    lockItems.push(CONTEXT_MENU_ITEM_SRC.UNLOCK);
  }
  if (lockItems.length > 0) {
    lockItems.push(CONTEXT_MENU_ITEM_SRC.SEPARATOR);
  }

  return [
    ...lockItems,
    CONTEXT_MENU_ITEM_SRC.DUPLICATE_SHAPE,
    ...(shapes[0].parentId ? [CONTEXT_MENU_ITEM_SRC.DUPLICATE_SHAPE_WITHIN_GROUP] : []),
    CONTEXT_MENU_ITEM_SRC.SEPARATOR,
    ...CONTEXT_MENU_COPY_SHAPE_ITEMS,
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
    case CONTEXT_MENU_ITEM_SRC.GROUP.key: {
      groupShapes(ctx);
      return;
    }
    case CONTEXT_MENU_ITEM_SRC.UNGROUP.key: {
      ungroupShapes(ctx);
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
    saveFileInWeb(builder.toDataURL(), "shapes.png");
  } catch (e) {
    ctx.showToastMessage({
      text: "Failed to create image",
      type: "error",
    });
    console.error(e);
  }
}

function getImageBuilderForSelectedShapes(ctx: AppCanvasStateContext) {
  const info = getExportParamsForSelectedShapes(ctx);
  return getImageBuilderForShapesWithRange(ctx, info.targetShapeComposite, info.range);
}

function getImageBuilderForSelectedRange(ctx: AppCanvasStateContext) {
  const info = getExportParamsForSelectedRange(ctx);
  return getImageBuilderForShapesWithRange(ctx, info.targetShapeComposite, info.range);
}

function getExportParamsForSelectedShapes(ctx: AppCanvasStateContext) {
  const shapeComposite = ctx.getShapeComposite();
  const targetShapes = shapeComposite.getAllBranchMergedShapes(Object.keys(ctx.getSelectedShapeIdMap()));
  const targetShapeComposite = newShapeComposite({ shapes: targetShapes, getStruct: ctx.getShapeStruct });
  // Get optimal exporting range for shapes.
  // This range may differ from visually selected range due to the optimization.
  const range = getIntRectFromFloatRect(getAllShapeRangeWithinComposite(targetShapeComposite, true));
  return { targetShapeComposite, range };
}

function getExportParamsForSelectedRange(ctx: AppCanvasStateContext) {
  const shapeComposite = ctx.getShapeComposite();
  const srcShapes = shapeComposite.getAllBranchMergedShapes(Object.keys(ctx.getSelectedShapeIdMap()));
  // Get currently selected range.
  // Unlike "getExportParamsForSelectedShapes", this function prioritizes visually selected range.
  const range = getIntRectFromFloatRect(shapeComposite.getWrapperRectForShapes(srcShapes, true));
  const targetShapes = shapeComposite.getShapesOverlappingRect(shapeComposite.shapes, range);
  const targetShapeComposite = newShapeComposite({ shapes: targetShapes, getStruct: ctx.getShapeStruct });
  return { targetShapeComposite, range };
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

  await exportAsSVG(ctx, getSVGBuilderForShapes(ctx, withMeta), withMeta ? `shapes${FOLLY_SVG_PREFIX}` : "shapes.svg");
}

async function exportRangeAsSVG(ctx: AppCanvasStateContext): Promise<void> {
  if (!ctx.getLastSelectedShapeId()) {
    ctx.showToastMessage({
      text: "No shape is selected",
      type: "error",
    });
    return;
  }

  await exportAsSVG(ctx, getSVGBuilderForRange(ctx), "shapes.svg");
}

async function exportAsSVG(ctx: AppCanvasStateContext, builder: SVGImageBuilder, name: string): Promise<void> {
  try {
    const dataURL = await builder.toDataURL();
    saveFileInWeb(dataURL, name);
  } catch (e: any) {
    ctx.showToastMessage({
      text: `Failed to create image. ${e.message}`,
      type: "error",
    });
    console.error(e);
  }
}

function getSVGBuilderForShapes(ctx: AppCanvasStateContext, withMeta = false) {
  const info = getExportParamsForSelectedShapes(ctx);
  return getSVGBuilderForShapesWithRange(ctx, info.targetShapeComposite, info.range, withMeta);
}

function getSVGBuilderForRange(ctx: AppCanvasStateContext, withMeta = false) {
  const info = getExportParamsForSelectedRange(ctx);
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

function saveFileInWeb(file: string, filename: string) {
  const a = document.createElement("a");
  a.href = file;
  a.download = filename;
  a.style.display = "none";
  a.click();
}

export function groupShapes(ctx: AppCanvasStateContext): boolean {
  const shapeComposite = ctx.getShapeComposite();
  const targetIds = Object.keys(ctx.getSelectedShapeIdMap());
  if (targetIds.length === 0 || !canGroupShapes(shapeComposite, targetIds)) return false;

  const group = createShape(shapeComposite.getShapeStruct, "group", { id: ctx.generateUuid() });
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
  const shapeMap = ctx.getShapeComposite().shapeMap;
  const groups = ids.map((id) => shapeMap[id]).filter(isGroupShape);
  if (groups.length === 0) return false;

  const groupIdSet = new Set(groups.map((s) => s.id));
  const patch = mapReduce(
    mapFilter(shapeMap, (s) => !!s.parentId && groupIdSet.has(s.parentId)),
    () => ({ parentId: undefined }),
  );

  ctx.deleteShapes(Array.from(groupIdSet), patch);
  ctx.multiSelectShapes(Object.keys(patch));
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

  const scale = ctx.getScale();
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
    { x: srcBounds.x + 20 * scale, y: srcBounds.y + 20 * scale },
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
