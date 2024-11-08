import { Shape } from "../models";
import { getConnections, isLineShape } from "../shapes/line";
import { isLineLabelShape } from "../shapes/utils/lineLabel";
import { DependencyMap, getAllDependants, reverseDepMap } from "../utils/graph";
import { ShapeComposite } from "./shapeComposite";

/**
 * Returns dependant shapes that can be affected by update of shapes with ids.
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
