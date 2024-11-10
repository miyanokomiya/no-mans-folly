import {
  getApproPoints,
  getCrossLineAndBezier3,
  getCrossSegAndLine,
  getDistance,
  getPathPointAtLengthFromStructs,
  getPedal,
  getPolylineLength,
  getRectCenter,
  getSymmetry,
  isOnSeg,
  isSame,
  IVec2,
  PathLengthStruct,
} from "okageo";
import { getEdges, LineShape, struct } from "../line";
import { isArcControl, isBezieirControl } from "../../utils/path";
import {
  BEZIER_APPROX_SIZE,
  getArcCurveParamsByNormalizedControl,
  getCrossLineAndArcRotated,
  getCurveLerpFn,
  getSegments,
  ISegment,
} from "../../utils/geometry";
import { pickMinItem } from "../../utils/commons";
import { ConnectionPoint } from "../../models";

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
  return getClosestOutlineInfoOfLineByEdgeInfo(edgeInfo, p, threshold);
}

export function getClosestOutlineInfoOfLineByEdgeInfo(
  edgeInfo: LineEdgeInfo,
  p: IVec2,
  threshold: number,
): [p: IVec2, rate: number] | undefined {
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

  let d = 0;
  for (let i = 0; i < closestEdgeIndex; i++) {
    d += edgeInfo.edgeLengths[i];
  }
  d += getDistance(edges[closestEdgeIndex][0], closestPedal);
  const rate = d / edgeInfo.totalLength;
  return [edgeInfo.lerpFn(rate), rate];
}

function getLinePathStruce(line: LineShape): PathLengthStruct[] {
  const edges = getEdges(line);
  return edges.map((edge, i) => {
    const curve = line.curves?.[i];
    const lerpFn = getCurveLerpFn(edge, curve);
    let points: IVec2[] = edge;
    let approxEdges = [edge];
    if (curve) {
      points = getApproPoints(lerpFn, BEZIER_APPROX_SIZE);
      approxEdges = getSegments(points);
    }
    return { lerpFn, length: getPolylineLength(points), curve: !!curve, approxEdges };
  });
}

export function getLineEdgeInfo(line: LineShape): {
  edges: ISegment[];
  edgeLengths: number[];
  totalLength: number;
  lerpFn: (rate: number) => IVec2;
} {
  const pathStructs = getLinePathStruce(line);
  const approxEdges = pathStructs.flatMap<ISegment>((s) => {
    if (s.curve) {
      return getSegments(getApproPoints(s.lerpFn, BEZIER_APPROX_SIZE));
    } else {
      return [[s.lerpFn(0), s.lerpFn(1)]];
    }
  });
  const edgeLengths = approxEdges.map((edge) => getDistance(edge[0], edge[1]));
  const totalLength = pathStructs.reduce((n, s) => n + s.length, 0);
  return {
    edges: approxEdges,
    edgeLengths,
    totalLength,
    lerpFn: (rate) => getPathPointAtLengthFromStructs(pathStructs, totalLength * rate),
  };
}
export type LineEdgeInfo = ReturnType<typeof getLineEdgeInfo>;

export function isConnectedToCenter(c: ConnectionPoint): boolean {
  return isSame(c.rate, { x: 0.5, y: 0.5 });
}

export function getIntersectionsBetweenLineShapeAndLine(shape: LineShape, line: ISegment): IVec2[] {
  const edges = getEdges(shape);
  const curves = shape.curves;

  const intersections: IVec2[] = [];
  edges.forEach((seg, i) => {
    const curve = curves?.[i];
    if (isBezieirControl(curve)) {
      const inter = getCrossLineAndBezier3(line, [seg[0], curve.c1, curve.c2, seg[1]]);
      if (inter.length > 0) intersections.push(...inter);
    } else if (isArcControl(curve)) {
      const arcParams = getArcCurveParamsByNormalizedControl(seg, curve.d);
      if (arcParams) {
        const inter = getCrossLineAndArcRotated(
          line,
          arcParams.c,
          arcParams.radius,
          arcParams.radius,
          0,
          arcParams.counterclockwise ? arcParams.to : arcParams.from,
          arcParams.counterclockwise ? arcParams.from : arcParams.to,
        );
        if (inter?.length) intersections.push(...inter);
      }
    } else {
      const inter = getCrossSegAndLine(seg, line);
      if (inter) intersections.push(inter);
    }
  });
  return intersections;
}
