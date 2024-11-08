import { Shape } from "../models";
import { getConnections, isLineShape } from "../shapes/line";
import { isLineLabelShape } from "../shapes/utils/lineLabel";
import { DependencyMap } from "../utils/graph";
import { ShapeComposite } from "./shapeComposite";

export function getLineRelatedDepMap(shapeComposite: ShapeComposite, ids: string[]): DependencyMap {
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

  const relatedSet = new Set(ids);
  const relatedStep = (id: string) => {
    const deps = allDepMap.get(id);
    if (!deps) return;

    deps.forEach((dep) => {
      if (relatedSet.has(dep)) return;

      relatedSet.add(dep);
      relatedStep(dep);
    });
  };
  ids.forEach(relatedStep);

  const ret: DependencyMap = new Map();
  relatedSet.forEach((id) => {
    const item = allDepMap.get(id);
    if (!item) return;
    ret.set(id, item);
  });
  return ret;
}
