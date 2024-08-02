import { Shape } from "../../../models";
import { createShape, duplicateShapes } from "../../../shapes";
import { isGroupShape } from "../../../shapes/group";
import { mapFilter, mapReduce, splitList } from "../../../utils/commons";
import { mergeEntityPatchInfo, normalizeEntityPatchInfo } from "../../../utils/entities";
import { FOLLY_SVG_PREFIX } from "../../../utils/shapeTemplateUtil";
import { newImageBuilder, newSVGImageBuilder } from "../../imageBuilder";
import { canGroupShapes, newShapeComposite } from "../../shapeComposite";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { newShapeRenderer } from "../../shapeRenderer";
import { newShapeSVGRenderer } from "../../shapeSVGRenderer";
import { TransitionValue } from "../core";
import { ContextMenuItem } from "../types";
import { AppCanvasStateContext, ContextMenuItemEvent } from "./core";

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

  EXPORT_AS_PNG: {
    label: "Export as PNG",
    key: "EXPORT_AS_PNG",
  },
  COPY_AS_PNG: {
    label: "Copy as PNG",
    key: "COPY_AS_PNG",
  },
  EXPORT_AS_SVG: {
    label: "Export as SVG",
    key: "EXPORT_AS_SVG",
  },
  COPY_AS_SVG: {
    label: "Copy as SVG",
    key: "COPY_AS_SVG",
  },
  EXPORT_AS_FOLLY_SVG: {
    label: "Export as [[FOLLY_SVG]]",
    key: "EXPORT_AS_FOLLY_SVG",
  },

  DELETE_LINE_VERTEX: {
    label: "Delete vertex",
    key: "DELETE_LINE_VERTEX",
  },

  SEPARATOR: { separator: true },
} satisfies { [key: string]: ContextMenuItem };

const CONTEXT_MENU_COPY_SHAPE_ITEMS: ContextMenuItem[] = [
  CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG,
  CONTEXT_MENU_ITEM_SRC.EXPORT_AS_PNG,
  CONTEXT_MENU_ITEM_SRC.EXPORT_AS_SVG,
  // CONTEXT_MENU_ITEM_SRC.COPY_AS_SVG, // Clipboard API doesn't go with "image/svg+xml"
  CONTEXT_MENU_ITEM_SRC.EXPORT_AS_FOLLY_SVG,
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
    case CONTEXT_MENU_ITEM_SRC.EXPORT_AS_PNG.key:
      exportShapesAsPNG(ctx);
      return;
    case CONTEXT_MENU_ITEM_SRC.EXPORT_AS_SVG.key:
      exportShapesAsSVG(ctx);
      return;
    case CONTEXT_MENU_ITEM_SRC.EXPORT_AS_FOLLY_SVG.key:
      exportShapesAsSVG(ctx, true);
      return;
  }
}

async function copyShapesAsPNG(ctx: AppCanvasStateContext): Promise<void> {
  const targetShapes = ctx.getShapeComposite().getAllBranchMergedShapes(Object.keys(ctx.getSelectedShapeIdMap()));

  const renderer = newShapeRenderer({
    shapeComposite: newShapeComposite({ shapes: targetShapes, getStruct: ctx.getShapeStruct }),
    getDocumentMap: ctx.getDocumentMap,
    imageStore: ctx.getImageStore(),
  });

  const range = ctx.getShapeComposite().getWrapperRectForShapes(targetShapes, true);
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

function exportShapesAsPNG(ctx: AppCanvasStateContext) {
  const targetShapes = ctx.getShapeComposite().getAllBranchMergedShapes(Object.keys(ctx.getSelectedShapeIdMap()));

  const renderer = newShapeRenderer({
    shapeComposite: newShapeComposite({ shapes: targetShapes, getStruct: ctx.getShapeStruct }),
    getDocumentMap: ctx.getDocumentMap,
    imageStore: ctx.getImageStore(),
  });

  const range = ctx.getShapeComposite().getWrapperRectForShapes(targetShapes, true);
  const builder = newImageBuilder({ render: renderer.render, range });
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

async function exportShapesAsSVG(ctx: AppCanvasStateContext, withMeta = false): Promise<void> {
  const targetShapes = ctx.getShapeComposite().getAllBranchMergedShapes(Object.keys(ctx.getSelectedShapeIdMap()));
  if (targetShapes.length === 0) {
    ctx.showToastMessage({
      text: "No shape is selected",
      type: "error",
    });
    return;
  }

  const renderer = newShapeSVGRenderer({
    shapeComposite: newShapeComposite({ shapes: targetShapes, getStruct: ctx.getShapeStruct }),
    getDocumentMap: ctx.getDocumentMap,
    imageStore: ctx.getImageStore(),
    assetAPI: ctx.assetAPI,
  });

  const range = ctx.getShapeComposite().getWrapperRectForShapes(targetShapes, true);

  try {
    const builder = newSVGImageBuilder({ render: withMeta ? renderer.renderWithMeta : renderer.render, range });
    const dataURL = await builder.toDataURL();
    saveFileInWeb(dataURL, withMeta ? `shapes${FOLLY_SVG_PREFIX}` : "shapes.svg");
  } catch (e: any) {
    ctx.showToastMessage({
      text: `Failed to create image. ${e.message}`,
      type: "error",
    });
    console.error(e);
  }
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
