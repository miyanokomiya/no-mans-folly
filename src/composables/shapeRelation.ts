import { Shape } from "../models";
import { getConnections, isLineShape } from "../shapes/line";
import { isLineLabelShape } from "../shapes/utils/lineLabel";
import { DependencyMap, getAllDependants, reverseDepMap } from "../utils/graph";
import { ShapeComposite } from "./shapeComposite";

/**
 * Returns dependant shapes that can be affected by update of shapes with ids.
 * This doesn't regard conventional tree structure of shapes.
 */
export function getLineRelatedDependantMap(shapeComposite: ShapeComposite, ids: string[]): DependencyMap {
  const allDepMap: DependencyMap = new Map();
  const step = (s: Shape) => {
    const deps = new Set<string>();

    if (shapeComposite.attached(s)) {
      deps.add(s.attachment.id);
    }
    if (isLineShape(s)) {
      getConnections(s).forEach((c) => {
        if (c && shapeComposite.shapeMap[c.id]) {
          deps.add(c.id);
        }
      });
    }
    if (isLineLabelShape(shapeComposite, s)) {
      deps.add(s.parentId);
    }

    allDepMap.set(s.id, deps);
  };
  shapeComposite.shapes.forEach((s) => {
    step(s);
  });

  const reversedAllDepMap = reverseDepMap(allDepMap);
  const allDependants = getAllDependants(allDepMap, reversedAllDepMap, ids);

  const targetSet = new Set<string>();
  ids.forEach((id) => targetSet.add(id));
  allDependants.forEach((id) => targetSet.add(id));

  const ret: DependencyMap = new Map();
  targetSet.forEach((id) => {
    const item = allDepMap.get(id);
    if (!item) return;
    ret.set(id, item);
  });
  return ret;
}

/**
 * This regards conventional tree structure of shapes.
 */
export function getLineUnrelatedIds(shapeComposite: ShapeComposite, ids: string[]): string[] {
  const dependantMap = getLineRelatedDependantMap(shapeComposite, ids);
  const relatedIdSet = new Set(
    shapeComposite.getAllBranchMergedShapes(Array.from(dependantMap.keys())).map((s) => s.id),
  );
  return Object.values(shapeComposite.shapeMap)
    .filter((s) => !relatedIdSet.has(s.id))
    .map((s) => s.id);
}

export function isParentDisconnected(
  shapeComposite: ShapeComposite,
  shape: Shape,
  patch?: Partial<Shape>,
): shape is Shape & Required<Pick<Shape, "parentId">> {
  return !!(shape && shapeComposite.hasParent(shape) && patch && "parentId" in patch && !patch.parentId);
}

export function getNextSiblingId(shapeComposite: ShapeComposite, id: string): string | undefined {
  const src = shapeComposite.shapeMap[id];
  const siblings = shapeComposite.hasParent(src)
    ? shapeComposite.mergedShapeTreeMap[src.parentId].children
    : shapeComposite.mergedShapeTree;
  const srcIndex = siblings.findIndex((s) => s.id === src.id);
  return siblings.at(srcIndex + 1)?.id;
}
