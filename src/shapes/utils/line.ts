import { add, getCrossSegAndBezier3WithT, getRectCenter, getSymmetry, isSame, IVec2, rotate, sub } from "okageo";
import { getConnection, getConnections, getEdges, getLinePath, LineShape, patchVertices, struct } from "../line";
import {
  getClosestPointOnPolyline,
  getIntersectionsBetweenLineAndPolyline,
  getPolylineEdgeInfo,
  isBezieirControl,
  PolylineEdgeInfo,
  reverseCurveControl,
  splitPathAtRate,
} from "../../utils/path";
import { getD2, getPointLerpSlope, ISegment } from "../../utils/geometry";
import { ConnectionPoint, CurveControl } from "../../models";
import { pickMinItemWithValue } from "../../utils/commons";

/**
 * Returns the line with minimum styles.
 * This can be useful for derive optimal bounds of the line.
 */
export function getNakedLineShape(line: LineShape): LineShape {
  return {
    ...line,
    stroke: { ...line.stroke, width: 0 },
    pHead: undefined,
    qHead: undefined,
  };
}

export function patchByFliplineH(line: LineShape): Partial<LineShape> {
  const rect = struct.getWrapperRect(line);
  const c = getRectCenter(rect);
  const flipFn = (v: IVec2) => getSymmetry(v, { x: c.x, y: v.y });
  return patchByFlipline(line, flipFn);
}

export function patchByFliplineV(line: LineShape): Partial<LineShape> {
  const rect = struct.getWrapperRect(line);
  const c = getRectCenter(rect);
  const flipFn = (v: IVec2) => getSymmetry(v, { x: v.x, y: c.y });
  return patchByFlipline(line, flipFn);
}

function patchByFlipline(line: LineShape, flipFn: (v: IVec2) => IVec2): Partial<LineShape> {
  const ret: Partial<LineShape> = {};

  const nextP = flipFn(line.p);
  const nextQ = flipFn(line.q);

  if (isSame(nextP, line.q) && isSame(nextQ, line.p)) {
    ret.p = line.q;
    ret.q = line.p;
    if (line.pConnection || line.qConnection) {
      ret.pConnection = line.qConnection;
      ret.qConnection = line.pConnection;
    }
  } else {
    if (!isSame(nextP, line.p)) {
      if (line.pConnection) ret.pConnection = undefined;
      ret.p = nextP;
    }

    if (!isSame(nextQ, line.q)) {
      if (line.qConnection) ret.qConnection = undefined;
      ret.q = nextQ;
    }
  }

  ret.body = line.body?.map((b) => {
    const p = flipFn(b.p);
    if (!isSame(p, b.p)) {
      if (b.c) return { p };
    }
    return { ...b, p };
  });
  ret.curves = line.curves?.map((c) =>
    !c ? undefined : isBezieirControl(c) ? { c1: flipFn(c.c1), c2: flipFn(c.c2) } : { d: { x: c.d.x, y: -c.d.y } },
  );

  return ret;
}

export function getClosestOutlineInfoOfLine(
  line: LineShape,
  p: IVec2,
  threshold: number,
): [p: IVec2, rate: number] | undefined {
  const edgeInfo = getLineEdgeInfo(line);
  return getClosestPointOnPolyline(edgeInfo, p, threshold);
}

export function getLineEdgeInfo(line: LineShape): PolylineEdgeInfo {
  return getPolylineEdgeInfo(getEdges(line), line.curves);
}

export function isConnectedToCenter(c: ConnectionPoint): boolean {
  return isSame(c.rate, { x: 0.5, y: 0.5 });
}

export function getIntersectionsBetweenLineShapeAndLine(shape: LineShape, line: ISegment): IVec2[] {
  return getIntersectionsBetweenLineAndPolyline(line, getEdges(shape), shape.curves);
}

export function getSegmentIndexCloseAt(line: LineShape, p: IVec2, threshold: number): number {
  const edges = getEdges(line);
  const curves = line.curves;
  return edges.findIndex((edge, i) => {
    const edgeInfo = getPolylineEdgeInfo([edge], [curves?.[i]]);
    return !!getClosestPointOnPolyline(edgeInfo, p, threshold);
  });
}

function getSegmentIndicesCloseAt(line: LineShape, p: IVec2, threshold: number): number[] {
  const edges = getEdges(line);
  const curves = line.curves;
  const ret: number[] = [];
  edges.findIndex((edge, i) => {
    const edgeInfo = getPolylineEdgeInfo([edge], [curves?.[i]]);
    if (getClosestPointOnPolyline(edgeInfo, p, threshold)) {
      ret.push(i);
    }
  });
  return ret;
}

export function getShapePatchInfoBySplittingLineAt(
  line: LineShape,
  index: number,
  p: IVec2,
  threshold: number,
):
  | [newLineSrc: Partial<LineShape>, currentLinePatch: Partial<LineShape>, rate: number, rateInEdge: number]
  | undefined {
  const edges = getEdges(line);
  const edge = edges[index];
  const curve = line.curves?.[index];
  const originalEdgeInfo = getPolylineEdgeInfo(edges, line.curves);
  const edgeInfo = getPolylineEdgeInfo([edge], [curve]);
  const closestInfo = getClosestPointOnPolyline(edgeInfo, p, threshold);
  if (!closestInfo) return;

  const vertices = getLinePath(line);

  const rateAtVertex =
    originalEdgeInfo.edgeLengths.slice(0, index).reduce((acc, v) => acc + v, 0) / originalEdgeInfo.totalLength;
  const rateInEdge = closestInfo[1] * (originalEdgeInfo.edgeLengths[index] / originalEdgeInfo.totalLength);
  const rate = rateInEdge + rateAtVertex;

  // Check if the closest point is a vertex.
  const sameVertexIndex = edge.findIndex((v) => isSame(v, closestInfo[0]));
  if (sameVertexIndex !== -1) {
    const splitVertexIndex = index + sameVertexIndex;
    if (splitVertexIndex === 0 || splitVertexIndex === vertices.length - 1) return;

    const connection = getConnection(line, splitVertexIndex);
    const currentLinePatch: Partial<LineShape> = {
      q: vertices[splitVertexIndex],
      qConnection: connection,
      body: cleanArray(line.body?.slice(0, splitVertexIndex - 1)),
      curves: cleanArray(line.curves?.slice(0, splitVertexIndex)),
      qHead: undefined,
    };
    const newLineSrc: Partial<LineShape> = {
      p: vertices[splitVertexIndex],
      pConnection: connection,
      q: line.q,
      qConnection: line.qConnection,
      body: cleanArray(line.body?.slice(splitVertexIndex)),
      curves: cleanArray(line.curves?.slice(splitVertexIndex)),
      pHead: undefined,
      qHead: line.qHead,
    };
    return [newLineSrc, currentLinePatch, rate, closestInfo[1]];
  }

  const controlRate = convertToControlRate(curve, edgeInfo, closestInfo[1], p, threshold);
  const splitResult = splitPathAtRate({ edge, curve }, controlRate);

  const filledCurves: LineShape["curves"] = line.curves?.concat() ?? [];
  for (let i = 0; i < edge.length; i++) {
    if (filledCurves[i] === undefined) {
      filledCurves[i] = undefined;
    }
  }

  const currentLinePatch: Partial<LineShape> = {
    q: splitResult[0].edge[1],
    qConnection: undefined,
    body: cleanArray(line.body?.slice(0, index)),
    curves: cleanArray([...filledCurves.slice(0, index), splitResult[0].curve]),
    qHead: undefined,
  };
  const newLineSrc: Partial<LineShape> = {
    p: splitResult[1].edge[0],
    pConnection: undefined,
    q: line.q,
    qConnection: line.qConnection,
    body: cleanArray(line.body?.slice(index)),
    curves: cleanArray([splitResult[1].curve, ...(line.curves?.slice(index + 1) ?? [])]),
    pHead: undefined,
    qHead: line.qHead,
  };
  return [newLineSrc, currentLinePatch, rate, closestInfo[1]];
}

export function getShapePatchInfoBySplittingLineThrough(
  line: LineShape,
  p: IVec2,
  threshold: number,
):
  | {
      newSrcList: Partial<LineShape>[];
      patch: Partial<LineShape>;
      // The rate of the split vertex based on the original line.
      rateList: number[];
    }
  | undefined {
  const originalVertices = getLinePath(line);
  const originalSize = originalVertices.length;
  const edgeInfo = getLineEdgeInfo(line);
  let rateList: number[] = [];
  const newSrcList: Partial<LineShape>[] = [];
  let patch: Partial<LineShape> | undefined;
  let latestLine = line;
  let originalIndex = 0;

  let index = getSegmentIndexCloseAt(line, p, threshold);
  while (index !== -1) {
    const result = getShapePatchInfoBySplittingLineAt(latestLine, index, p, threshold);
    if (!result) break;

    if (!patch && newSrcList.length === 0) {
      patch = result[1];
    } else {
      newSrcList[newSrcList.length - 1] = { ...newSrcList[newSrcList.length - 1], ...result[1] };
    }
    newSrcList.push(result[0]);
    latestLine = { ...latestLine, ...result[0] };

    originalIndex = originalSize - getLinePath(latestLine).length;
    // Need to adjust the original index if the split point is at the end of the edge.
    if (isSame(originalVertices[originalIndex], latestLine.p)) {
      originalIndex -= 1;
    }

    const rateAtVertex =
      edgeInfo.edgeLengths.slice(0, originalIndex).reduce((acc, v) => acc + v, 0) / edgeInfo.totalLength;
    const rateInEdge = result[3] * (edgeInfo.edgeLengths[originalIndex] / edgeInfo.totalLength);
    const rate = rateInEdge + rateAtVertex;

    rateList = [...rateList, rate];
    const indices = getSegmentIndicesCloseAt(latestLine, p, threshold).filter((i) => 0 < i);
    index = indices.at(0) ?? -1;
  }

  return patch ? { newSrcList, patch, rateList } : undefined;
}

export function getShapePatchInfoByInsertingVertexAt(
  line: LineShape,
  index: number,
  p: IVec2,
  threshold: number,
): [currentLinePatch: Partial<LineShape>, rate: number] | undefined {
  const edge = getEdges(line)[index];
  const curve = line.curves?.[index];
  const edgeInfo = getPolylineEdgeInfo([edge], [curve]);
  const closestInfo = getClosestPointOnPolyline(edgeInfo, p, threshold);
  if (!closestInfo) return;

  // Check if the closest point is a vertex of the edge.
  if (edge.find((v) => isSame(v, closestInfo[0]))) return;

  const controlRate = convertToControlRate(curve, edgeInfo, closestInfo[1], p, threshold);
  const splitResult = splitPathAtRate({ edge, curve }, controlRate);

  const body = line.body?.concat() ?? [];
  body.splice(index, 0, { p: splitResult[0].edge[1] });
  const curves = line.curves?.concat() ?? [];
  curves.splice(index, 1, splitResult[0].curve, splitResult[1].curve);

  const currentLinePatch: Partial<LineShape> = {
    body,
    curves: cleanArray(curves),
  };
  return [currentLinePatch, closestInfo[1]];
}

/**
 * This function tries to insert a vertex to the line by punctuating the line multiple times.
 */
export function getShapePatchInfoByInsertingVertexThrough(
  line: LineShape,
  p: IVec2,
  threshold: number,
):
  | {
      patch: Partial<LineShape>;
      // index: The index of the inserted vertex.
      // rate: The rate of the inserted vertex.
      insertions: [index: number, rate: number][];
    }
  | undefined {
  const edgeInfo = getLineEdgeInfo(line);
  let rateList: [number, number][] = [];
  let latestPatch = {};
  let latestLine = line;
  let latestEdgeSize = getEdges(latestLine).length;

  let index = getSegmentIndexCloseAt(line, p, threshold);
  while (0 <= index && index < latestEdgeSize) {
    const result = getShapePatchInfoByInsertingVertexAt(latestLine, index, p, threshold);
    if (!result) {
      index += 1;
      continue;
    }

    latestLine = { ...latestLine, ...result[0] };
    latestPatch = { ...latestPatch, ...result[0] };
    latestEdgeSize += 1;

    const originalIndex = index - rateList.length;
    const rateAtVertex =
      edgeInfo.edgeLengths.slice(0, originalIndex).reduce((acc, v) => acc + v, 0) / edgeInfo.totalLength;
    const rateInEdge = result[1] * (edgeInfo.edgeLengths[originalIndex] / edgeInfo.totalLength);
    const rate = rateInEdge + rateAtVertex;

    rateList = [...rateList, [index + 1, rate]];
    const indices = getSegmentIndicesCloseAt(latestLine, p, threshold).filter((i) => index + 1 < i);
    index = indices.at(0) ?? -1;
  }

  return rateList.length > 0 ? { patch: latestPatch, insertions: rateList } : undefined;
}

/**
 * Convert distance rate to bezier control value t when the curve is a bezier.
 * The rate is based on the distance of the curve, so it's not same as bezier control value t.
 */
function convertToControlRate(
  curve: CurveControl | undefined,
  edgeInfo: PolylineEdgeInfo,
  distanceRate: number,
  p: IVec2,
  threshold: number,
): number {
  if (isBezieirControl(curve)) {
    const slopeR = getPointLerpSlope(edgeInfo.lerpFn, distanceRate);
    const normalV = rotate({ x: 1, y: 0 }, slopeR + Math.PI / 2);
    const normalSeg: ISegment = [sub(p, normalV), add(p, normalV)];
    const edge = [edgeInfo.lerpFn(0), edgeInfo.lerpFn(1)];
    const intersections = getCrossSegAndBezier3WithT(normalSeg, [edge[0], curve.c1, curve.c2, edge[1]]);
    const minItem = pickMinItemWithValue(intersections, (v) => getD2(sub(p, v[0])));
    if (minItem && minItem[1] < threshold ** 2) {
      return minItem[0][1];
    }
  }
  return distanceRate;
}

/**
 * Returns undefined when every item in the array is undefined.
 */
function cleanArray(arr?: any[]) {
  return arr?.every((v) => v === undefined) ? undefined : arr;
}

/**
 * Calculates the new rate for a point at rate `s` on a line split at rate `t`.
 * @param rate - The original rate of the point on the line.
 * @param splitRate - The rate at which the line is split.
 * @returns The new rate on the each split line.
 */
export function getNewRateAfterSplit(rate: number, splitRate: number): [number, undefined] | [undefined, number] {
  if (rate <= splitRate) {
    return [rate / splitRate, undefined];
  } else {
    return [undefined, (rate - splitRate) / (1 - splitRate)];
  }
}

export function getPatchByExtrudeLineSegment(
  line: LineShape,
  segmentIndex: number,
  translate: IVec2,
): Partial<LineShape> {
  const srcVertices = getLinePath(line);
  const srcConnections = getConnections(line);
  const srcCurves = line.curves;

  const translatePatch = patchVertices(line, [
    [segmentIndex, add(srcVertices[segmentIndex], translate), undefined],
    [segmentIndex + 1, add(srcVertices[segmentIndex + 1], translate), undefined],
  ]);

  const body = translatePatch?.body?.concat() ?? [];
  if (segmentIndex === 0) {
    if (translatePatch.p) {
      body.splice(0, 0, { p: translatePatch.p });
    }
  } else {
    body.splice(segmentIndex - 1, 0, { p: srcVertices[segmentIndex], c: srcConnections[segmentIndex] });
  }
  if (segmentIndex === srcVertices.length - 2) {
    if (translatePatch.q) {
      body.splice(srcVertices.length, 0, { p: translatePatch.q });
    }
  } else {
    body.splice(segmentIndex + 2, 0, { p: srcVertices[segmentIndex + 1], c: srcConnections[segmentIndex + 1] });
  }

  const curves = srcCurves?.concat() ?? [];
  if (srcCurves?.slice(segmentIndex).some((c) => !!c)) {
    curves.splice(segmentIndex, 0, undefined);
  }
  if (srcCurves?.slice(segmentIndex + 1).some((c) => !!c)) {
    curves.splice(segmentIndex + 2, 0, undefined);
  }
  if (srcCurves?.[segmentIndex]) {
    curves[segmentIndex + 1] = translatePatch.curves?.[segmentIndex];
  }

  const patch = { body } as Partial<LineShape>;
  if (curves.length > 0) {
    patch.curves = curves;
  }
  return patch;
}

export function canConcatLine(line: LineShape): boolean {
  return line.lineType !== "elbow";
}

export function canConcatLines(a: LineShape, b: LineShape): boolean {
  if (a === b || !canConcatLine(a)) return false;
  return a.lineType === b.lineType && a.curveType === b.curveType;
}

/**
 * Mode
 * - 0: Head of A -> Head of B
 * - 1: Head of A -> Tail of B
 * - 2: Tail of A -> Head of B
 * - 3: Tail of A -> Tail of B
 *
 * This doesn't recalculate line layout.
 * Returned patch is intended for "src".
 */
export function getPatchByConcatLines(src: LineShape, b: LineShape, mode: 0 | 1 | 2 | 3): Partial<LineShape> {
  const adjustedA = mode === 0 || mode === 1 ? { ...src, ...getPatchByReverseLine(src) } : src;
  const adjustedB = mode === 1 || mode === 3 ? { ...b, ...getPatchByReverseLine(b) } : b;

  const curves: LineShape["curves"] = [...(adjustedA.curves ?? []), undefined];
  const curvesB = cleanArray(adjustedB.curves);
  if (curvesB) {
    const verticesA = getLinePath(src);
    // Make sure to fulfil curve items when the latter line has curves.
    while (curves.length < verticesA.length) {
      curves.push(undefined);
    }
    curves.push(...curvesB);
  }

  const ret = {
    p: adjustedA.p,
    pConnection: adjustedA.pConnection,
    pHead: adjustedA.pHead,
    body: [...(adjustedA.body ?? []), { p: adjustedA.q }, { p: adjustedB.p }, ...(adjustedB.body ?? [])],
    curves,
    q: adjustedB.q,
    qConnection: adjustedB.qConnection,
    qHead: adjustedB.qHead,
  } as LineShape;
  return ret;
}

export function getPatchByReverseLine(line: LineShape): Partial<LineShape> {
  return {
    p: line.q,
    q: line.p,
    pConnection: line.qConnection,
    qConnection: line.pConnection,
    pHead: line.qHead,
    qHead: line.pHead,
    body: line.body?.toReversed(),
    curves: line.curves?.toReversed().map((c) => reverseCurveControl(c)),
  };
}
