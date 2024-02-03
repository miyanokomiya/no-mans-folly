import { newImageBuilder, newSVGImageBuilder } from "../../imageBuilder";
import { newShapeComposite } from "../../shapeComposite";
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
} satisfies { [key: string]: ContextMenuItem };

export const CONTEXT_MENU_COPY_SHAPE_ITEMS: ContextMenuItem[] = [
  CONTEXT_MENU_ITEM_SRC.EXPORT_AS_PNG,
  CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG,
  CONTEXT_MENU_ITEM_SRC.EXPORT_AS_SVG,
  // CONTEXT_MENU_ITEM_SRC.COPY_AS_SVG, // Clipboard API doesn't go with "image/svg+xml"
];

export const CONTEXT_MENU_SHAPE_SELECTED_ITEMS: ContextMenuItem[] = [
  CONTEXT_MENU_ITEM_SRC.DELETE_SHAPE,
  { separator: true },
  ...CONTEXT_MENU_COPY_SHAPE_ITEMS,
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
    case CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG.key:
      copyShapesAsPNG(ctx);
      return;
    case CONTEXT_MENU_ITEM_SRC.EXPORT_AS_PNG.key:
      exportShapesAsPNG(ctx);
      return;
    case CONTEXT_MENU_ITEM_SRC.EXPORT_AS_SVG.key:
      exportShapesAsSVG(ctx);
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

async function exportShapesAsSVG(ctx: AppCanvasStateContext): Promise<void> {
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
  });

  const range = ctx.getShapeComposite().getWrapperRectForShapes(targetShapes, true);
  const builder = newSVGImageBuilder({ render: renderer.render, range });

  try {
    saveFileInWeb(builder.toDataURL(), "shapes.svg");
  } catch (e) {
    ctx.showToastMessage({
      text: "Failed to create image",
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
