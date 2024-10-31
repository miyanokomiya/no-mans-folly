import {
  getApproPoints,
  getDistance,
  getPathPointAtLengthFromStructs,
  getPedal,
  getPolylineLength,
  getRectCenter,
  getSymmetry,
  isOnSeg,
  isSame,
  IVec2,
} from "okageo";
import { getLinePath, isCurveLine, LineShape, struct } from "../line";
import { isBezieirControl } from "../../utils/path";
import { BEZIER_APPROX_SIZE, getCurveLerpFn, getSegments, ISegment } from "../../utils/geometry";
import { pickMinItem } from "../../utils/commons";

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
  const edgeInfo = getEdgeInfo(line);
  const edges = edgeInfo.edges;

  const values = edges
    .map<[number, number, IVec2]>((edge, i) => {
      let pedal = getPedal(p, edge);
      if (!isOnSeg(pedal, edge)) {
        pedal = getDistance(edge[0], p) <= getDistance(edge[1], p) ? edge[0] : edge[1];
      }
      return [i, getDistance(p, pedal), pedal];
    })
    .filter((v) => v[1] < threshold);
  const closestValue = pickMinItem(values, (v) => v[1]);
  if (!closestValue) return;

  const closestEdgeIndex = closestValue[0];
  const closestPedal = closestValue[2];

  const dList = edgeInfo.edgeLengths;
  const totalD = edgeInfo.totalLength;
  let d = 0;
  for (let i = 0; i < closestEdgeIndex; i++) {
    d += dList[i];
  }
  d += getDistance(edges[closestEdgeIndex][0], closestPedal);
  const rate = d / totalD;

  return [closestPedal, rate];
}

function getEdgeInfo(line: LineShape): {
  edges: ISegment[];
  edgeLengths: number[];
  totalLength: number;
  lerpFn?: (rate: number) => IVec2;
} {
  const edges = getSegments(getLinePath(line));
  if (!isCurveLine(line)) {
    const edgeLengths = edges.map((edge) => getDistance(edge[0], edge[1]));
    return {
      edges,
      edgeLengths,
      totalLength: edgeLengths.reduce((n, l) => n + l, 0),
    };
  }

  const pathStructs = edges.map((edge, i) => {
    const curve = line.curves[i];
    const lerpFn = getCurveLerpFn(edge, curve);
    let points: IVec2[] = edge;
    let edges = [edge];
    if (curve) {
      points = getApproPoints(lerpFn, BEZIER_APPROX_SIZE);
      edges = getSegments(points);
    }
    return { lerpFn, length: getPolylineLength(points), edges };
  });

  const approxEdges = pathStructs.flatMap((s) => s.edges);
  const edgeLengths = approxEdges.map((edge) => getDistance(edge[0], edge[1]));
  const totalLength = pathStructs.reduce((n, s) => n + s.length, 0);
  return {
    edges: approxEdges,
    edgeLengths,
    totalLength,
    lerpFn: (rate) => getPathPointAtLengthFromStructs(pathStructs, totalLength * rate),
  };
}
