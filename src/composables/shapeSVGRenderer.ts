import { DocOutput } from "../models/document";
import { getShapeTextBounds } from "../shapes";
import { createSVGElement, createSVGSVGElement, renderTransform } from "../utils/svgElements";
import { getDocCompositionInfo, renderSVGDocByComposition } from "../utils/textEditor";
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
      const info = option.shapeComposite.createSVGElementInfo(shape, option.imageStore);
      if (!info) return;

      const elm = createSVGElement(info.tag, info.attributes, info.children);
      root.appendChild(elm);

      const doc = docMap[shape.id];
      if (doc) {
        const bounds = getShapeTextBounds(option.shapeComposite.getShapeStruct, shape);

        const infoCache = option.shapeComposite.getDocCompositeCache(shape.id);
        const info = infoCache ?? getDocCompositionInfo(doc, ctx, bounds.range.width, bounds.range.height);
        if (!infoCache) {
          option.shapeComposite.setDocCompositeCache(shape.id, info);
        }

        const docElmInfo = renderSVGDocByComposition(info.composition, info.lines);
        const transform = renderTransform(bounds.affine);
        if (transform) {
          docElmInfo.attributes ??= {};
          docElmInfo.attributes.transform = renderTransform(bounds.affine);
        }
        const docElm = createSVGElement(docElmInfo.tag, docElmInfo.attributes, docElmInfo.children);
        root.appendChild(docElm);
      }
    });

    return root;
  }

  return { render };
}
export type ShapeSVGRenderer = ReturnType<typeof newShapeSVGRenderer>;
