import { AssetAPI } from "../hooks/persistence";
import { Shape } from "../models";
import { DocOutput } from "../models/document";
import { getShapeTextBounds } from "../shapes";
import { blobToBase64 } from "../utils/fileAccess";
import { createTemplateShapeEmbedElement } from "../utils/shapeTemplateUtil";
import { createSVGElement, createSVGSVGElement, renderTransform } from "../utils/svgElements";
import { getDocCompositionInfo, hasDocNoContent, renderSVGDocByComposition } from "../utils/textEditor";
import { walkTree } from "../utils/tree";
import { ImageStore } from "./imageStore";
import { ShapeComposite } from "./shapeComposite";

interface Option {
  shapeComposite: ShapeComposite;
  getDocumentMap: () => { [id: string]: DocOutput };
  imageStore?: ImageStore;
  assetAPI: AssetAPI;
}

export function newShapeSVGRenderer(option: Option) {
  const { mergedShapeMap, mergedShapeTree } = option.shapeComposite;
  const docMap = option.getDocumentMap();

  async function render(ctx: CanvasRenderingContext2D): Promise<SVGSVGElement> {
    const root = createSVGSVGElement();

    walkTree(mergedShapeTree, (node) => {
      const shape = mergedShapeMap[node.id];
      const doc = docMap[shape.id];
      const elm = createShapeElement(option, ctx, shape, doc);
      if (elm) {
        root.appendChild(elm);
      }
    });

    // Gather asset files used in the SVG.
    const assetDataMap = new Map<string, { width: number; height: number; base64: string }>();
    for (const elm of root.querySelectorAll("use[href]")) {
      if (!option.assetAPI?.enabled) {
        // TODO: Show warning message: "assetAPI" isn't available.
        throw new Error(`Asset API is unavailable.`);
      }

      const useElm = elm as SVGUseElement;
      const assetId = useElm.href.baseVal.slice(1);
      const assetData = option.imageStore?.getImageData(assetId);
      if (!assetData) {
        throw new Error(`Not found image data: ${assetId}.`);
      }

      try {
        const assetFile = await option.assetAPI.loadAsset(assetId);
        if (!assetFile) {
          throw new Error(`Not found image data: ${assetId}.`);
        }

        const base64 = await blobToBase64(assetFile, true);
        assetDataMap.set(assetId, { width: assetData.img.width, height: assetData.img.height, base64 });
      } catch (e: any) {
        console.error(e);
        throw new Error(`Failed to load image file: ${assetId}. ${e.message}`);
      }
    }

    // Embed asset files in a def tag.
    const assetDef = createSVGElement("def");
    for (const [assetId, data] of assetDataMap.entries()) {
      const imageElm = createSVGElement("image", {
        id: assetId,
        href: data.base64,
        width: data.width,
        height: data.height,
      });
      assetDef.appendChild(imageElm);
    }

    if (assetDef.children.length > 0) {
      root.prepend(assetDef);
    }

    return root;
  }

  async function renderWithMeta(ctx: CanvasRenderingContext2D): Promise<SVGSVGElement> {
    const root = await render(ctx);

    // Embed shape data to the SVG.
    const targets = option.shapeComposite.getAllBranchMergedShapes(mergedShapeTree.map((t) => t.id));
    const docs: [string, DocOutput][] = targets.filter((s) => !!docMap[s.id]).map((s) => [s.id, docMap[s.id]]);
    root.appendChild(createTemplateShapeEmbedElement({ shapes: targets, docs }));

    return root;
  }

  return { render, renderWithMeta };
}
export type ShapeSVGRenderer = ReturnType<typeof newShapeSVGRenderer>;

function createShapeElement(
  option: Option,
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  doc?: DocOutput,
): SVGElement | undefined {
  const shapeElmInfo = option.shapeComposite.createSVGElementInfo(shape, option.imageStore);
  if (!shapeElmInfo) return;

  if (!doc || hasDocNoContent(doc)) {
    const shapeElm = createSVGElement(shapeElmInfo.tag, shapeElmInfo.attributes, shapeElmInfo.children);
    return shapeElm;
  }

  const bounds = getShapeTextBounds(option.shapeComposite.getShapeStruct, shape);

  const infoCache = option.shapeComposite.getDocCompositeCache(shape.id, doc);
  const docInfo = infoCache ?? getDocCompositionInfo(doc, ctx, bounds.range.width, bounds.range.height);

  const docElmInfo = renderSVGDocByComposition(docInfo.composition, docInfo.lines);
  const transform = renderTransform(bounds.affine);
  if (transform) {
    docElmInfo.attributes ??= {};
    docElmInfo.attributes.transform = renderTransform(bounds.affine);
  }
  const wrapperElm = createSVGElement("g", undefined, [shapeElmInfo, docElmInfo]);
  return wrapperElm;
}
