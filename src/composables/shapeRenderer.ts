import { DocOutput } from "../models/document";
import { getShapeTextBounds } from "../shapes";
import { getDocCompositionInfo, renderDocByComposition } from "../utils/textEditor";
import { walkTree } from "../utils/tree";
import { ImageStore } from "./imageStore";
import { ShapeComposite } from "./shapeComposite";

interface Option {
  shapeComposite: ShapeComposite;
  getDocumentMap: () => { [id: string]: DocOutput };
  ignoreDocIds?: string[];
  imageStore?: ImageStore;
}

export function newShapeRenderer(option: Option) {
  const { mergedShapeMap, mergedShapeTree } = option.shapeComposite;
  const docMap = option.getDocumentMap();
  const ignoreDocIdSet = new Set(option.ignoreDocIds ?? []);

  function render(ctx: CanvasRenderingContext2D) {
    walkTree(mergedShapeTree, (node) => {
      const shape = mergedShapeMap[node.id];
      option.shapeComposite.render(ctx, shape, option.imageStore);

      const doc = docMap[shape.id];
      if (doc && !ignoreDocIdSet.has(shape.id)) {
        ctx.save();
        const bounds = getShapeTextBounds(option.shapeComposite.getShapeStruct, shape);
        ctx.transform(...bounds.affine);

        const infoCache = option.shapeComposite.getDocCompositeCache(shape.id);
        const info = infoCache ?? getDocCompositionInfo(doc, ctx, bounds.range.width, bounds.range.height);
        if (!infoCache) {
          option.shapeComposite.setDocCompositeCache(shape.id, info);
        }

        renderDocByComposition(ctx, info.composition, info.lines);
        ctx.restore();
      }
    });
  }

  return { render };
}
export type ShapeRenderer = ReturnType<typeof newShapeRenderer>;
