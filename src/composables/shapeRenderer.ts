import { Shape } from "../models";
import { DocOutput } from "../models/document";
import { GetShapeStruct, getShapeTextBounds, renderShape } from "../shapes";
import { mergeMap } from "../utils/commons";
import { renderDoc } from "../utils/textEditor";
import { getTree, walkTree } from "../utils/tree";

interface Option {
  getShapeIds: () => string[]; // represents shapes' order
  getShapeMap: () => { [id: string]: Shape };
  getTmpShapeMap: () => { [id: string]: Partial<Shape> };
  getDocumentMap: () => { [id: string]: DocOutput };
  getShapeStruct: GetShapeStruct;
  ignoreDocIds?: string[];
}

export function newShapeRenderer(option: Option) {
  const shapeMap = option.getShapeMap();
  const tmpShapeMap = option.getTmpShapeMap();
  const docMap = option.getDocumentMap();
  const ignoreDocIdSet = new Set(option.ignoreDocIds ?? []);

  const ids = option.getShapeIds();
  const mergedShapeMap = mergeMap(shapeMap, tmpShapeMap) as { [id: string]: Shape };
  const mergedShapes = ids.map((id) => mergedShapeMap[id]);
  const shapeTree = getTree(mergedShapes);

  function render(ctx: CanvasRenderingContext2D) {
    walkTree(shapeTree, (node) => {
      const shape = mergedShapeMap[node.id];
      renderShape(option.getShapeStruct, ctx, shape);

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
