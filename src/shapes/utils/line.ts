import { add, getCrossSegAndBezier3WithT, getRectCenter, getSymmetry, isSame, IVec2, rotate, sub } from "okageo";
import { getConnection, getEdges, getLinePath, LineShape, struct } from "../line";
import {
  getClosestPointOnPolyline,
  getIntersectionsBetweenLineAndPolyline,
  getPolylineEdgeInfo,
  isBezieirControl,
  PolylineEdgeInfo,
  splitPathAtRate,
} from "../../utils/path";
import { getD2, getPointLerpSlope, ISegment } from "../../utils/geometry";
import { ConnectionPoint } from "../../models";
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

export function getShapePatchInfoBySplitingLineAt(
  line: LineShape,
  index: number,
  p: IVec2,
  threshold: number,
): [newLineSrc: Partial<LineShape>, currentLinePatch: Partial<LineShape>] | undefined {
  const edge = getEdges(line)[index];
  const curve = line.curves?.[index];
  const edgeInfo = getPolylineEdgeInfo([edge], [curve]);
  const closestInfo = getClosestPointOnPolyline(edgeInfo, p, threshold);
  if (!closestInfo) return;

  const vertices = getLinePath(line);

  // Check if the closest point is a vertex.
  const sameVertexIndex = vertices.findIndex((v) => isSame(v, closestInfo[0]));
  if (sameVertexIndex !== -1) {
    if (sameVertexIndex === 0 || sameVertexIndex === vertices.length - 1) return;

    const connection = getConnection(line, sameVertexIndex);
    const currentLinePatch: Partial<LineShape> = {
      q: vertices[sameVertexIndex],
      qConnection: connection,
      body: cleanArray(line.body?.slice(0, sameVertexIndex - 1)),
      curves: cleanArray(line.curves?.slice(0, sameVertexIndex)),
      qHead: undefined,
    };
    const newLineSrc: Partial<LineShape> = {
      p: vertices[sameVertexIndex],
      pConnection: connection,
      q: line.q,
      qConnection: line.qConnection,
      body: cleanArray(line.body?.slice(sameVertexIndex)),
      curves: cleanArray(line.curves?.slice(sameVertexIndex)),
      pHead: undefined,
      qHead: line.qHead,
    };
    return [newLineSrc, currentLinePatch];
  }

  let rate = closestInfo[1];
  // Convert the rate to bezier control value t when the curve is a bezier.
  // The rate is based on the distance of the curve, so it's not same as bezier control value t.
  if (isBezieirControl(curve)) {
    const slopeR = getPointLerpSlope(edgeInfo.lerpFn, rate);
    const normalV = rotate({ x: 1, y: 0 }, slopeR + Math.PI / 2);
    const normalSeg: ISegment = [sub(p, normalV), add(p, normalV)];
    const intersections = getCrossSegAndBezier3WithT(normalSeg, [edge[0], curve.c1, curve.c2, edge[1]]);
    const minItem = pickMinItemWithValue(intersections, (v) => getD2(sub(p, v[0])));
    if (minItem && minItem[1] < threshold ** 2) {
      rate = minItem[0][1];
    }
  }
  const splitResult = splitPathAtRate({ edge, curve }, rate);

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
  return [newLineSrc, currentLinePatch];
}

function cleanArray(arr?: any[]) {
  return arr?.every((v) => v === undefined) ? undefined : arr;
}
