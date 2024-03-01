import { DocOutput } from "../models/document";
import { getShapeTextBounds } from "../shapes";
import { createSVGElement, createSVGSVGElement, renderTransform } from "../utils/svgElements";
import { getDocCompositionInfo, hasDocNoContent, renderSVGDocByComposition } from "../utils/textEditor";
import { walkTree } from "../utils/tree";
import { ImageStore } from "./imageStore";
import { ShapeComposite } from "./shapeComposite";

interface Option {
  shapeComposite: ShapeComposite;
  getDocumentMap: () => { [id: string]: DocOutput };
  imageStore?: ImageStore;
}

export function newShapeSVGRenderer(option: Option) {
  const { mergedShapeMap, mergedShapeTree } = option.shapeComposite;
  const docMap = option.getDocumentMap();

  function render(ctx: CanvasRenderingContext2D): SVGSVGElement {
    const root = createSVGSVGElement();

    walkTree(mergedShapeTree, (node) => {
      const shape = mergedShapeMap[node.id];
      const shapeElmInfo = option.shapeComposite.createSVGElementInfo(shape, option.imageStore);
      if (!shapeElmInfo) return;

      const doc = docMap[shape.id];
      if (!doc || hasDocNoContent(doc)) {
        const shapeElm = createSVGElement(shapeElmInfo.tag, shapeElmInfo.attributes, shapeElmInfo.children);
        root.appendChild(shapeElm);
        return;
      }

      const bounds = getShapeTextBounds(option.shapeComposite.getShapeStruct, shape);

      const infoCache = option.shapeComposite.getDocCompositeCache(shape.id);
      const docInfo = infoCache ?? getDocCompositionInfo(doc, ctx, bounds.range.width, bounds.range.height);
      if (!infoCache) {
        option.shapeComposite.setDocCompositeCache(shape.id, docInfo);
      }

      const docElmInfo = renderSVGDocByComposition(docInfo.composition, docInfo.lines);
      const transform = renderTransform(bounds.affine);
      if (transform) {
        docElmInfo.attributes ??= {};
        docElmInfo.attributes.transform = renderTransform(bounds.affine);
      }
      const wrapperElm = createSVGElement("g", undefined, [shapeElmInfo, docElmInfo]);
      root.appendChild(wrapperElm);
    });

    // Embed asset files used in this SVG.
    const usedAssetIdSet = new Set();
    const assetDef = createSVGElement("def");
    root.querySelectorAll("use[href]").forEach((elm) => {
      const useElm = elm as SVGUseElement;
      const assetId = useElm.href.baseVal.slice(1);
      const img = option.imageStore?.getImage(assetId);
      if (!img) return;

      // Resize the element via "transform" attribute here since its "width" and "height" don't affect its size.
      const width = useElm.width.baseVal.value;
      const height = useElm.height.baseVal.value;
      const tranform = renderTransform([width / img.width, 0, 0, height / img.height, 0, 0]);
      if (tranform) {
        useElm.setAttribute("transform", tranform);
      }

      if (usedAssetIdSet.has(assetId)) return;
      usedAssetIdSet.add(assetId);

      const assetCanvas = document.createElement("canvas");
      assetCanvas.width = img.width;
      assetCanvas.height = img.height;
      const assetCtx = assetCanvas.getContext("2d");
      if (!assetCtx) return;

      assetCtx.drawImage(img, 0, 0, img.width, img.height);
      const base64 = assetCanvas.toDataURL();
      const imageElm = createSVGElement("image", {
        id: assetId,
        href: base64,
        width: img.width,
        height: img.height,
      });
      assetDef.appendChild(imageElm);
    });
    if (assetDef.children.length > 0) {
      root.prepend(assetDef);
    }

    return root;
  }

  return { render };
}
export type ShapeSVGRenderer = ReturnType<typeof newShapeSVGRenderer>;
