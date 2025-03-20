import { getConnections, isLineShape } from "../shapes/line";
import { isVNNodeShape, VnNodeShape } from "../shapes/vectorNetworks/vnNode";
import { ShapeComposite } from "./shapeComposite";
import { getLineRelatedDependantMap } from "./shapeRelation";

export function getConnectedLineInfoListAtNode(
  shapeComposite: ShapeComposite,
  nodeId: string,
): [id: string, index: number][] {
  const ret: [string, number][] = [];
  shapeComposite.shapes.forEach((s) => {
    if (!isLineShape(s)) return;
    getConnections(s).forEach((c, i) => {
      if (c?.id !== nodeId) return;
      ret.push([s.id, i]);
    });
  });
  return ret;
}

export function getAnyConnectedLineInfoAtNode(
  shapeComposite: ShapeComposite,
  nodeId: string,
): [id: string, index: number] | undefined {
  for (let i = 0; i < shapeComposite.shapes.length; i++) {
    // Prioritize latter items since they are displayed forward.
    const s = shapeComposite.shapes[shapeComposite.shapes.length - 1 - i];
    if (!isLineShape(s)) continue;

    const connections = getConnections(s);
    for (let j = 0; j < connections.length; j++) {
      const c = connections[j];
      if (c?.id !== nodeId) continue;
      return [s.id, i];
    }
  }
}

/**
 * Seek a VN node shape that is near by the given source shapes.
 * e.g. Let new node inherit style properties from use this node.
 */
export function seekNearbyVnNode(shapeComposite: ShapeComposite, srcIds: string[]): VnNodeShape | undefined {
  const depMap = getLineRelatedDependantMap(shapeComposite, srcIds);
  for (const [, depSet] of depMap) {
    for (const id of depSet) {
      const src = shapeComposite.shapeMap[id];
      if (src && isVNNodeShape(src)) {
        return src;
      }
    }
  }
}
