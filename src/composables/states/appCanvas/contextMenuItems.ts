import { createShape, duplicateShapes } from "../../../shapes";
import { isGroupShape } from "../../../shapes/group";
import { mapFilter, mapReduce } from "../../../utils/commons";
import { FOLLY_SVG_PREFIX } from "../../../utils/shapeTemplateUtil";
import { newImageBuilder, newSVGImageBuilder } from "../../imageBuilder";
import { canGroupShapes, newShapeComposite } from "../../shapeComposite";
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

  GROUP: {
    label: "Group",
    key: "GROUP",
  },
  UNGROUP: {
    label: "Ungroup",
    key: "UNGROUP",
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
    label: "Export as Folly SVG",
    key: "EXPORT_AS_FOLLY_SVG",
  },

  DELETE_LINE_VERTEX: {
    label: "Delete vertex",
    key: "DELETE_LINE_VERTEX",
  },

  SEPARATOR: { separator: true },
} satisfies { [key: string]: ContextMenuItem };

export const CONTEXT_MENU_COPY_SHAPE_ITEMS: ContextMenuItem[] = [
  CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG,
  CONTEXT_MENU_ITEM_SRC.EXPORT_AS_PNG,
  CONTEXT_MENU_ITEM_SRC.EXPORT_AS_SVG,
  // CONTEXT_MENU_ITEM_SRC.COPY_AS_SVG, // Clipboard API doesn't go with "image/svg+xml"
  CONTEXT_MENU_ITEM_SRC.EXPORT_AS_FOLLY_SVG,
];

export const CONTEXT_MENU_SHAPE_SELECTED_ITEMS: ContextMenuItem[] = [
  CONTEXT_MENU_ITEM_SRC.DUPLICATE_SHAPE,
  CONTEXT_MENU_ITEM_SRC.SEPARATOR,
  ...CONTEXT_MENU_COPY_SHAPE_ITEMS,
  CONTEXT_MENU_ITEM_SRC.SEPARATOR,
  CONTEXT_MENU_ITEM_SRC.DELETE_SHAPE,
];

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
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      if (ids.length === 0) return;

      const scale = ctx.getScale();
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const docMap = ctx.getDocumentMap();
      const srcShapes = ids.map((id) => shapeMap[id]);
      const srcBounds = shapeComposite.getWrapperRectForShapes(srcShapes);
      const duplicated = duplicateShapes(
        ctx.getShapeStruct,
        srcShapes,
        ids.filter((id) => !!docMap[id]).map((id) => [id, docMap[id]]),
        ctx.generateUuid,
        ctx.createLastIndex(),
        new Set(Object.keys(shapeMap)),
        { x: srcBounds.x + 20 * scale, y: srcBounds.y + 20 * scale },
      );

      ctx.addShapes(duplicated.shapes, duplicated.docMap);
      ctx.multiSelectShapes(duplicated.shapes.map((s) => s.id));
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
