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

    // Gather asset files used in the SVG.
    const assetDataMap = new Map<string, { width: number; height: number; img: HTMLImageElement }>();
    root.querySelectorAll("use[href]").forEach((elm) => {
      const useElm = elm as SVGUseElement;
      const assetId = useElm.href.baseVal.slice(1);
      const imageData = option.imageStore?.getImageData(assetId);
      if (!imageData) return;

      const { img, type } = imageData;
      // Resize the element via "transform" attribute here since its "width" and "height" don't affect its size.
      const width = useElm.width.baseVal.value;
      const height = useElm.height.baseVal.value;
      const tranform = renderTransform([width / img.width, 0, 0, height / img.height, 0, 0]);
      if (tranform) {
        useElm.setAttribute("transform", tranform);
      }

      if (type !== "image/svg+xml") {
        assetDataMap.set(assetId, { width: img.width, height: img.height, img });
        return;
      }

      // When the image is SVG, save the widest shape size.
      // => Use this size to expand SVG when it's drawn to "canvas".
      const data = assetDataMap.get(assetId);
      const { width: currentWidth, height: currentHeight } = data ?? img;
      if (currentWidth * currentHeight < width * height) {
        assetDataMap.set(assetId, { width, height, img });
      } else {
        assetDataMap.set(assetId, { width: currentWidth, height: currentHeight, img });
      }
    });

    // Embed asset files in a def tag.
    const assetDef = createSVGElement("def");
    for (const [assetId, data] of assetDataMap.entries()) {
      const assetCanvas = document.createElement("canvas");
      assetCanvas.width = data.width;
      assetCanvas.height = data.height;
      const assetCtx = assetCanvas.getContext("2d")!;
      assetCtx.drawImage(data.img, 0, 0, assetCanvas.width, assetCanvas.height);
      const base64 = assetCanvas.toDataURL();
      const imageElm = createSVGElement("image", {
        id: assetId,
        href: base64,
        width: data.img.width,
        height: data.img.height,
      });
      assetDef.appendChild(imageElm);
    }

    if (assetDef.children.length > 0) {
      root.prepend(assetDef);
    }

    return root;
  }

  return { render };
}
export type ShapeSVGRenderer = ReturnType<typeof newShapeSVGRenderer>;
