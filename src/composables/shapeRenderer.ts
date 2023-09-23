import { DocOutput } from "../models/document";
import { GetShapeStruct, getShapeTextBounds, renderShape } from "../shapes";
import { renderDoc } from "../utils/textEditor";
import { walkTree } from "../utils/tree";
import { ShapeComposite } from "./shapeComposite";

interface Option {
  shapeComposite: ShapeComposite;
  getDocumentMap: () => { [id: string]: DocOutput };
  getShapeStruct: GetShapeStruct;
  ignoreDocIds?: string[];
}

export function newShapeRenderer(option: Option) {
  const { mergedShapeMap, mergedShapeTree } = option.shapeComposite;
  const docMap = option.getDocumentMap();
  const ignoreDocIdSet = new Set(option.ignoreDocIds ?? []);

  function render(ctx: CanvasRenderingContext2D) {
    walkTree(mergedShapeTree, (node) => {
      const shape = mergedShapeMap[node.id];
      renderShape(option.getShapeStruct, ctx, shape, mergedShapeMap, node);

      const doc = docMap[shape.id];
      if (doc && !ignoreDocIdSet.has(shape.id)) {
        ctx.save();
        const bounds = getShapeTextBounds(option.getShapeStruct, shape);
        ctx.transform(...bounds.affine);
        renderDoc(ctx, doc, bounds.range);
        ctx.restore();
      }
    });
  }

  return { render };
}
export type ShapeRenderer = ReturnType<typeof newShapeRenderer>;
