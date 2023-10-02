import { Shape } from "../models";
import { mergeMap, toMap } from "../utils/commons";
import { flatTree, getAllBranchIds, getTree } from "../utils/tree";

interface Option {
  shapes: Shape[];
  tmpShapeMap?: { [id: string]: Partial<Shape> };
}

export function newShapeComposite(option: Option) {
  const shapeMap = toMap(option.shapes);
  const mergedShapeMap = option.tmpShapeMap
    ? (mergeMap(shapeMap, option.tmpShapeMap) as { [id: string]: Shape })
    : shapeMap;
  const mergedShapes = option.shapes.map((s) => mergedShapeMap[s.id]);
  const mergedShapeTree = getTree(mergedShapes);

  function getAllBranchMergedShapes(ids: string[]): Shape[] {
    return getAllBranchIds(mergedShapeTree, ids).map((id) => mergedShapeMap[id]);
  }

  return {
    shapes: option.shapes,
    shapeMap,
    tmpShapeMap: option.tmpShapeMap ?? {},
    mergedShapes,
    mergedShapeMap: toMap(mergedShapes),
    mergedShapeTree,
    mergedShapeTreeMap: toMap(flatTree(mergedShapeTree)),
    getAllBranchMergedShapes,
  };
}
export type ShapeComposite = ReturnType<typeof newShapeComposite>;
