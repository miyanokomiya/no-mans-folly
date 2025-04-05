import { createZip } from "littlezipper";
import { addSuffixToAvoidDuplication } from "../../../../utils/text";
import { getAllFrameGroupShapes, getAllFrameShapes, getFrameTree } from "../../../frame";
import { newImageBuilder, newSVGImageBuilder } from "../../../imageBuilder";
import { escapeFilename, getExportParamsForSelectedRange, saveFileInWeb } from "../../../shapeExport";
import { newShapeRenderer } from "../../../shapeRenderer";
import { newShapeSVGRenderer } from "../../../shapeSVGRenderer";
import { AppCanvasStateContext } from "../core";
import { TreeNode } from "../../../../utils/tree";
import { SHEET_THUMBNAIL_PREFIX } from "../../../../utils/fileAccess";

type ZipItem = [name: string, ext: string, Uint8Array];

async function saveZipAsFile(name: string, items: ZipItem[]) {
  const names = addSuffixToAvoidDuplication(items.map(([name]) => name));
  const zip = await createZip(
    items.map(([, ext, data], i) => ({ path: `${names[i]}.${ext}`, data })),
    true,
  );
  const blob = new Blob([zip], { type: "application/x-zip" });
  const url = URL.createObjectURL(blob);
  saveFileInWeb(url, name);
  URL.revokeObjectURL(url);
}

export interface ExportFrameOptions {
  imageType: "png" | "svg" | "folly-svg" | "print";
  hideFrame?: boolean;
  sequencePrefix?: boolean;
  hideNameOnPrint?: boolean;
  roundFloat?: boolean;
}

export async function exportFrameAsPNG(
  ctx: AppCanvasStateContext,
  frameIdSet: Set<string>,
  onProgress: (progress: number) => void,
  options: Pick<ExportFrameOptions, "hideFrame" | "sequencePrefix">,
) {
  if (frameIdSet.size === 0) return;

  onProgress(0);
  const shapeComposite = ctx.getShapeComposite();
  const frames = getAllFrameShapes(shapeComposite);

  const frameGroups = getAllFrameGroupShapes(shapeComposite);
  const excludeIdSet = new Set(frameGroups.map((f) => f.id));
  if (options.hideFrame) {
    frames.forEach((f) => excludeIdSet.add(f.id));
  }

  const indexTextMap = getFrameIndexTextMap(getFrameTree(shapeComposite));
  const ext = "png";
  const items: ZipItem[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frameIdSet.has(frame.id)) continue;

    const info = getExportParamsForSelectedRange(shapeComposite, [frame.id], excludeIdSet);
    const renderer = newShapeRenderer({
      shapeComposite: info.targetShapeComposite,
      getDocumentMap: ctx.getDocumentMap,
      imageStore: ctx.getImageStore(),
    });
    const builder = newImageBuilder({ render: renderer.render, range: info.range });

    const prefix = options.sequencePrefix ? `${indexTextMap.get(frame.id)}_` : "";
    const name = `${prefix}${escapeFilename(frame.name)}`;

    if (frameIdSet.size === 1) {
      saveFileInWeb(builder.toDataURL(), `${name}.${ext}`);
      return;
    }

    const blob = await builder.toBlob();
    const buffer = await blob.arrayBuffer();
    items.push([name, ext, new Uint8Array(buffer)]);
    onProgress(items.length / frameIdSet.size);
  }

  await saveZipAsFile("frames-png.zip", items);
}

export async function exportFrameAsSVG(
  ctx: AppCanvasStateContext,
  frameIdSet: Set<string>,
  onProgress: (progress: number) => void,
  withMeta: boolean,
  options: Pick<ExportFrameOptions, "hideFrame" | "sequencePrefix" | "roundFloat">,
) {
  if (frameIdSet.size === 0) return;

  onProgress(0);
  const shapeComposite = ctx.getShapeComposite();
  const frames = getAllFrameShapes(shapeComposite);

  const frameGroups = getAllFrameGroupShapes(shapeComposite);
  const excludeIdSet = new Set(frameGroups.map((f) => f.id));
  if (options.hideFrame) {
    frames.forEach((f) => excludeIdSet.add(f.id));
  }

  const indexTextMap = getFrameIndexTextMap(getFrameTree(shapeComposite));
  const ext = withMeta ? "folly.svg" : "svg";
  const items: ZipItem[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frameIdSet.has(frame.id)) continue;

    const info = getExportParamsForSelectedRange(shapeComposite, [frame.id], excludeIdSet, withMeta);
    const renderer = newShapeSVGRenderer({
      shapeComposite: info.targetShapeComposite,
      getDocumentMap: ctx.getDocumentMap,
      imageStore: ctx.getImageStore(),
      assetAPI: ctx.assetAPI,
      roundFloat: options.roundFloat,
    });
    const builder = newSVGImageBuilder({
      render: withMeta ? renderer.renderWithMeta : renderer.render,
      range: info.range,
    });

    const prefix = options.sequencePrefix ? `${indexTextMap.get(frame.id)}_` : "";
    const name = `${prefix}${escapeFilename(frame.name)}`;

    if (frameIdSet.size === 1) {
      return builder.toDataURL(async (url) => {
        saveFileInWeb(url, `${name}.${ext}`);
      });
    }

    const blob = await builder.toBlob();
    const buffer = await blob.arrayBuffer();
    items.push([name, ext, new Uint8Array(buffer)]);
    onProgress(items.length / frameIdSet.size);
  }

  await saveZipAsFile(withMeta ? "frames-folly-svg.zip" : "frames-svg.zip", items);
}

export async function printFrameAsDocument(
  ctx: AppCanvasStateContext,
  frameIdSet: Set<string>,
  onProgress: (progress: number) => void,
  options: Pick<ExportFrameOptions, "hideFrame" | "sequencePrefix" | "hideNameOnPrint">,
) {
  if (frameIdSet.size === 0) return;

  let subwindow: Window | null = null;
  try {
    subwindow = window.open(undefined, "_blank");
    if (!subwindow) return;

    onProgress(0);
    const shapeComposite = ctx.getShapeComposite();
    const frames = getAllFrameShapes(shapeComposite);

    const frameGroups = getAllFrameGroupShapes(shapeComposite);
    const excludeIdSet = new Set(frameGroups.map((f) => f.id));
    if (options.hideFrame) {
      frames.forEach((f) => excludeIdSet.add(f.id));
    }

    const indexTextMap = getFrameIndexTextMap(getFrameTree(shapeComposite));
    const items: [name: string, SVGElement][] = [];

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (!frameIdSet.has(frame.id)) continue;

      const info = getExportParamsForSelectedRange(shapeComposite, [frame.id], excludeIdSet);
      const renderer = newShapeSVGRenderer({
        shapeComposite: info.targetShapeComposite,
        getDocumentMap: ctx.getDocumentMap,
        imageStore: ctx.getImageStore(),
        assetAPI: ctx.assetAPI,
      });
      const builder = newSVGImageBuilder({
        render: renderer.render,
        range: info.range,
      });
      const svg = await builder.getSvgElement();
      const prefix = options.sequencePrefix ? `${indexTextMap.get(frame.id)}_` : "";
      items.push([`${prefix}${frame.name}`, svg]);
      onProgress(items.length / frameIdSet.size);
    }

    const fragment = subwindow.document.createDocumentFragment();
    items.forEach(([name, svg]) => {
      fragment.appendChild(createFrameBlock(subwindow!, name, svg, options.hideNameOnPrint));
    });
    subwindow.document.body.appendChild(fragment);
    subwindow.document.title = "Frames";
    subwindow.print();
  } finally {
    subwindow?.close();
  }
}

function createFrameBlock(subwindow: Window, name: string, svg: SVGElement, hideName = false): HTMLElement {
  const div = subwindow.document.createElement("div");
  div.style.breakAfter = "page";

  if (!hideName) {
    const h2 = subwindow.document.createElement("h2");
    h2.textContent = name;
    h2.style.fontSize = "20px";
    h2.style.margin = "0 0 4px 0";
    h2.style.padding = "0";
    h2.style.fontFamily = "Arial";
    h2.style.fontWeight = "400";
    div.appendChild(h2);
  }

  div.appendChild(svg);
  return div;
}

function getFrameIndexTextMap(frameTree: TreeNode[]): Map<string, string> {
  const ret = new Map<string, string>();
  frameTree.forEach((tree, i) => {
    const rootText = `${i + 1}`;
    ret.set(tree.id, rootText);
    tree.children.forEach((c, j) => {
      ret.set(c.id, `${rootText}-${j + 1}`);
    });
  });
  return ret;
}

export async function saveSheetThumbnailAsSvg(sheetId: string, ctx: AppCanvasStateContext) {
  const assetAPI = ctx.assetAPI;
  if (!assetAPI.enabled) return;

  const imageStore = ctx.getImageStore();
  const shapeComposite = ctx.getShapeComposite();
  const range = shapeComposite.getWrapperRectForShapes(shapeComposite.shapes, true);
  const renderer = newShapeSVGRenderer({
    shapeComposite: shapeComposite,
    getDocumentMap: ctx.getDocumentMap,
    imageStore,
    assetAPI,
  });
  const builder = newSVGImageBuilder({
    render: renderer.renderWithMeta,
    range,
  });
  try {
    const blob = await builder.toBlob();
    const assetId = `${SHEET_THUMBNAIL_PREFIX}${sheetId}.svg`;
    await assetAPI.saveAsset(assetId, blob);
    await imageStore.loadFromFile(assetId, blob);
  } catch (e: any) {
    ctx.showToastMessage({
      text: `Failed to save sheet thumbnail. ${e.message}`,
      type: "error",
    });
    console.error(e);
  }
}
