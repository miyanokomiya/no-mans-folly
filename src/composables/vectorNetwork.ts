import { Shape } from "../models";
import { getConnections, isLineShape } from "../shapes/line";
import { isTextShape, TextShape } from "../shapes/text";
import { getNewRateAfterSplit } from "../shapes/utils/line";
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

/**
 * Some properties, such as `attachment`, shouldn't be inherited.
 */
export function getInheritableVnNodeProperties(shape?: VnNodeShape): Partial<VnNodeShape> | undefined {
  return shape
    ? {
        parentId: shape.parentId,
        alpha: shape.alpha,
        noExport: shape.noExport,
        fill: shape.fill,
        stroke: shape.stroke,
        r: shape.r,
      }
    : undefined;
}

export function patchBySplitAttachingLine(
  shapeComposite: ShapeComposite,
  srcLineId: string,
  splitLineId: string,
  splitRate: number,
): { [id: string]: Partial<Shape> } {
  const ret: { [id: string]: Partial<Shape> } = {};
  shapeComposite.shapes.forEach((s) => {
    if (s.attachment?.id === srcLineId) {
      const splitRates = getNewRateAfterSplit(s.attachment.to.x, splitRate);
      ret[s.id] = {
        attachment: {
          ...s.attachment,
          id: splitRates[0] !== undefined ? srcLineId : splitLineId,
          to: { x: splitRates[0] ?? splitRates[1], y: s.attachment.to.y },
        },
      };
    } else if (isTextShape(s) && s.parentId === srcLineId) {
      const splitRates = getNewRateAfterSplit(s.lineAttached ?? 0, splitRate);
      ret[s.id] = {
        parentId: splitRates[0] !== undefined ? srcLineId : splitLineId,
        lineAttached: splitRates[0] ?? splitRates[1],
      } as Partial<TextShape>;
    }
  });
  return ret;
}
