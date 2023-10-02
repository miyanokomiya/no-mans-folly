import { Shape } from "../models";
import { GetShapeStruct, renderShape } from "../shapes";
import { mergeMap, toMap } from "../utils/commons";
import { flatTree, getAllBranchIds, getTree } from "../utils/tree";
import { ImageStore } from "./imageStore";

interface Option {
  shapes: Shape[];
  getStruct: GetShapeStruct;
  tmpShapeMap?: { [id: string]: Partial<Shape> };
}

export function newShapeComposite(option: Option) {
  const shapeMap = toMap(option.shapes);
  const mergedShapeMap = option.tmpShapeMap
    ? (mergeMap(shapeMap, option.tmpShapeMap) as { [id: string]: Shape })
    : shapeMap;
  const mergedShapes = option.shapes.map((s) => mergedShapeMap[s.id]);
  const mergedShapeTree = getTree(mergedShapes);
  const mergedShapeTreeMap = toMap(flatTree(mergedShapeTree));

  const shapeContext = {
    shapeMap: mergedShapeMap,
    treeNodeMap: mergedShapeTreeMap,
  };

  function getAllBranchMergedShapes(ids: string[]): Shape[] {
    return getAllBranchIds(mergedShapeTree, ids).map((id) => mergedShapeMap[id]);
  }

  function render(ctx: CanvasRenderingContext2D, shape: Shape, imageStore?: ImageStore) {
    renderShape(option.getStruct, ctx, shape, shapeContext, imageStore);
  }

  return {
    shapes: option.shapes,
    shapeMap,
    tmpShapeMap: option.tmpShapeMap ?? {},
    mergedShapes,
    mergedShapeMap,
    mergedShapeTree,
    mergedShapeTreeMap: toMap(flatTree(mergedShapeTree)),
    getAllBranchMergedShapes,

    render,
  };
}
export type ShapeComposite = ReturnType<typeof newShapeComposite>;
