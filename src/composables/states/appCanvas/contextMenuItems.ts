import { getWrapperRectForShapes } from "../../../shapes";
import { newImageBuilder } from "../../imageBuilder";
import { newShapeComposite } from "../../shapeComposite";
import { newShapeRenderer } from "../../shapeRenderer";
import { TransitionValue } from "../core";
import { ContextMenuItem } from "../types";
import { AppCanvasStateContext, ContextMenuItemEvent } from "./core";

export const CONTEXT_MENU_ITEM_SRC = {
  EXPORT_AS_PNG: {
    label: "Export as PNG",
    key: "EXPORT_AS_PNG",
  },
  COPY_AS_PNG: {
    label: "Copy as PNG",
    key: "COPY_AS_PNG",
  },
} satisfies { [key: string]: ContextMenuItem };

export function handleContextItemEvent(
  ctx: AppCanvasStateContext,
  event: ContextMenuItemEvent
): TransitionValue<AppCanvasStateContext> {
  ctx.setContextMenuList();
  switch (event.data.key) {
    case CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG.key:
      copyShapesAsPNG(ctx);
      return;
    case CONTEXT_MENU_ITEM_SRC.EXPORT_AS_PNG.key:
      exportShapesAsPNG(ctx);
      return;
  }
}

async function copyShapesAsPNG(ctx: AppCanvasStateContext): Promise<void> {
  const targetShapes = ctx.getShapeComposite().getAllBranchMergedShapes(Object.keys(ctx.getSelectedShapeIdMap()));

  const renderer = newShapeRenderer({
    shapeComposite: newShapeComposite({ shapes: targetShapes, getStruct: ctx.getShapeStruct }),
    getDocumentMap: ctx.getDocumentMap,
    getShapeStruct: ctx.getShapeStruct,
    imageStore: ctx.getImageStore(),
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

function exportShapesAsPNG(ctx: AppCanvasStateContext) {
  const targetShapes = ctx.getShapeComposite().getAllBranchMergedShapes(Object.keys(ctx.getSelectedShapeIdMap()));

  const renderer = newShapeRenderer({
    shapeComposite: newShapeComposite({ shapes: targetShapes, getStruct: ctx.getShapeStruct }),
    getDocumentMap: ctx.getDocumentMap,
    getShapeStruct: ctx.getShapeStruct,
    imageStore: ctx.getImageStore(),
  });

  const range = getWrapperRectForShapes(ctx.getShapeStruct, targetShapes, true);
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

function saveFileInWeb(file: string, filename: string) {
  const a = document.createElement("a");
  a.href = file;
  a.download = filename;
  a.style.display = "none";
  a.click();
}
