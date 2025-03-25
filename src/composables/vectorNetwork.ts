import { isSame } from "okageo";
import { Shape } from "../models";
import { getConnections, getLinePath, isLineShape, LineShape } from "../shapes/line";
import { isTextShape, TextShape } from "../shapes/text";
import { getNewRateAfterSplit } from "../shapes/utils/line";
import { isVNNodeShape, VnNodeShape } from "../shapes/vectorNetworks/vnNode";
import { getSegments } from "../utils/geometry";
import { newRawVectorNetwork, RawVnEdge, RawVnNode } from "../utils/vectorNetwork";
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
  splits: [splitLineId: string, rate: number][],
): { [id: string]: Partial<Shape> } {
  const ret: { [id: string]: Partial<Shape> } = {};

  const getConnection = (rate: number): [id: string, rate: number] => {
    const splitIndexAfter = splits.findIndex(([, r]) => rate < r);

    // Attach to the first split line.
    if (splitIndexAfter === 0) {
      const [nextRate] = getNewRateAfterSplit(rate, splits[0][1]) as [number, undefined];
      return [srcLineId, nextRate];
    }

    // Attach to the last split line.
    if (splitIndexAfter === -1) {
      const splitFrom = splits[splits.length - 1];
      const [, nextRate] = getNewRateAfterSplit(rate, splitFrom[1]) as [undefined, number];
      return [splitFrom[0], nextRate];
    }

    // Attach to the middle split line.
    const splitFrom = splits[splitIndexAfter - 1];
    const splitTo = splits[splitIndexAfter];
    const [, nextRateSrc] = getNewRateAfterSplit(rate, splitFrom[1]) as [undefined, number];
    const [, actualSplitToRate] = getNewRateAfterSplit(splitTo[1], splitFrom[1]) as [undefined, number];
    const [nextRate] = getNewRateAfterSplit(nextRateSrc, actualSplitToRate) as [number, undefined];
    return [splitFrom[0], nextRate];
  };

  shapeComposite.shapes.forEach((s) => {
    if (s.attachment?.id === srcLineId) {
      const rate = s.attachment.to.x;
      const [nextId, nextRate] = getConnection(rate);
      ret[s.id] = {
        attachment: { ...s.attachment, id: nextId, to: { x: nextRate, y: s.attachment.to.y } },
      };
    } else if (isTextShape(s) && s.parentId === srcLineId) {
      const [nextId, nextRate] = getConnection(s.lineAttached ?? 0);
      ret[s.id] = { parentId: nextId, lineAttached: nextRate } as Partial<TextShape>;
    }
  });
  return ret;
}

type VectorNetworkOption = {
  shapeComposite: ShapeComposite;
  ids: string[];
};

export function newVectorNetwork(option: VectorNetworkOption) {
  const sc = option.shapeComposite;
  const lineMap = new Map<string, LineShape>();
  const rawNodeMap = new Map<string, RawVnNode>();
  const rawEdgeMap = new Map<string, RawVnEdge>();

  option.ids
    .map((id) => sc.shapeMap[id])
    .forEach((s) => {
      if (isLineShape(s)) {
        lineMap.set(s.id, s);
      } else if (isVNNodeShape(s)) {
        rawNodeMap.set(s.id, { id: s.id, position: s.p });
      }
    });

  lineMap.forEach((line) => {
    const segs = getSegments(getLinePath(line));
    const connections = getConnections(line);
    segs.forEach((seg, i) => {
      const id = `${line.id}_${i}`;
      const c0 = connections[i];
      const c1 = connections[i + 1];

      let node0 = rawNodeMap.get(c0?.id ?? `${line.id}_${i - 1}_1`);
      if (!node0) {
        node0 = { id: `${line.id}_${i}_0`, position: seg[0] };
        rawNodeMap.set(node0.id, node0);
      }

      let node1 = rawNodeMap.get(c1?.id ?? "");
      if (i === segs.length - 1 && !node1) {
        const head = segs[0][0];
        const tail = seg[1];
        if (isSame(head, tail)) {
          const headNode = rawEdgeMap.get(`${line.id}_0`)?.nodes[0];
          node1 = headNode;
        }
      }
      if (!node1) {
        node1 = { id: `${line.id}_${i}_1`, position: seg[1] };
        rawNodeMap.set(node1.id, node1);
      }

      rawEdgeMap.set(id, {
        id,
        curve: line.curves?.[i],
        nodes: [node0, node1],
      });
    });
  });

  return newRawVectorNetwork({ nodes: rawNodeMap, edges: rawEdgeMap });
}
