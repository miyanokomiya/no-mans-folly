import {
  AffineMatrix,
  IVec2,
  MINVALUE,
  PathLengthStruct,
  add,
  applyAffine,
  divideBezier3,
  getApproPoints,
  getCenter,
  getCrossLineAndBezier3,
  getCrossSegAndBezier3WithT,
  getCrossSegAndLine,
  getDistance,
  getInner,
  getNorm,
  getPathPointAtLengthFromStructs,
  getPedal,
  getPolylineLength,
  getRadian,
  getUnit,
  isOnSeg,
  lerpPoint,
  multi,
  multiAffines,
  sub,
} from "okageo";
import { ArcCurveControl, BezierCurveControl, CurveControl } from "../models";
import {
  BEZIER_APPROX_SIZE,
  ISegment,
  getArcCurveParamsByNormalizedControl,
  getArcLerpFn,
  getCrossLineAndArcRotated,
  getCrossSegAndSegWithT,
  getCurveLerpFn,
  getCurvePathStructs,
  getRotateFn,
  getSegments,
} from "./geometry";
import { pickMinItem } from "./commons";

export type BezierPath = { path: IVec2[]; curves: (BezierCurveControl | undefined)[] };

export type PathLocation = [point: IVec2, segmentIndex: number, segmentRate: number];

type PathLengthStructWithApproxSize = PathLengthStruct & { approxSize: number };

export function isBezieirControl(c: CurveControl | undefined): c is BezierCurveControl {
  return !!c && "c1" in c;
}

export function isArcControl(c: CurveControl | undefined): c is ArcCurveControl {
  return !!c && "d" in c;
}

export function getCrossBezierPathAndSegment(bezierPath: BezierPath, segment: ISegment): PathLocation[] {
  const { path, curves } = completeBezierPath(bezierPath);
  const candidates: PathLocation[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const pathSeg: ISegment = [path[i], path[i + 1]];
    const c = curves[i];
    if (c) {
      candidates.push(
        ...getCrossSegAndBezier3WithT(segment, [pathSeg[0], c.c1, c.c2, pathSeg[1]]).map<[IVec2, number, number]>(
          ([p, t]) => [p, i, t],
        ),
      );
    } else {
      const crossInfo = getCrossSegAndSegWithT(segment, pathSeg);
      if (crossInfo) candidates.push([crossInfo[0], i, crossInfo[2]]);
    }
  }

  return candidates;
}

/**
 * The order of vertices is basically unstable and unreliable.
 * - It starts from the first intersected segment when each intersection is on the unique segment.
 */
export function combineBezierPathAndPath(
  bezierPath: BezierPath,
  intersections: [PathLocation, PathLocation],
  middlePath: IVec2[],
): BezierPath {
  const { path, curves } = completeBezierPath(bezierPath);
  const [cross0, cross1] = intersections;
  const ret: BezierPath = { path: [], curves: [] };

  if (cross0[1] === cross1[1]) {
    // When both intersections are on the same segment
    for (let i = 0; i < path.length - 1; i++) {
      const p = path[i];
      const q = path[i + 1];
      const c = curves[i];

      ret.path.push(p);

      if (i === cross0[1]) {
        if (c) {
          const [b0] = divideBezier3([p, c.c1, c.c2, q], cross0[2]);
          ret.curves.push({ c1: b0[1], c2: b0[2] });
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          middlePath.forEach((p) => {
            ret.path.push(p);
            ret.curves.push(undefined);
          });

          const [, d1] = divideBezier3([p, c.c1, c.c2, q], cross1[2]);
          ret.path.push(cross1[0]);
          ret.curves.push({ c1: d1[1], c2: d1[2] });
        } else {
          ret.curves.push(undefined);
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          middlePath.forEach((p) => {
            ret.path.push(p);
            ret.curves.push(undefined);
          });
          ret.path.push(cross1[0]);
          ret.curves.push(undefined);
        }
      } else {
        ret.curves.push(c);
      }

      if (i === path.length - 2 && !(bezierPath.path.length < path.length)) {
        ret.path.push(q);
      }
    }
  } else {
    // When each intersection is on the deferrent segment
    let insideIntersections = false;

    for (let i = 0; i < path.length; i++) {
      const adjustedIndex = i + cross0[1];
      const realIndex = adjustedIndex % path.length;
      const realNextIndex = (adjustedIndex + 1) % path.length;
      const p = path[realIndex];
      const q = path[realNextIndex];
      const c = curves[realIndex];

      const pushP = () => {
        // Ignore the vertex when it's inserted via completing process.
        if (!(realIndex === path.length - 1 && bezierPath.path.length < path.length)) {
          ret.path.push(p);
        }
      };
      const pushC = () => {
        // Same as "pushP"
        if (!(realIndex === path.length - 1 && bezierPath.path.length < path.length)) {
          ret.curves.push(c);
        }
      };

      if (realIndex === cross0[1]) {
        pushP();

        if (c) {
          const [b0] = divideBezier3([p, c.c1, c.c2, q], cross0[2]);
          ret.curves.push({ c1: b0[1], c2: b0[2] });
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          middlePath.forEach((m) => {
            ret.path.push(m);
            ret.curves.push(undefined);
          });
        } else {
          pushC();
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          middlePath.forEach((m) => {
            ret.path.push(m);
            ret.curves.push(undefined);
          });
        }
        insideIntersections = true;
      } else if (realIndex === cross1[1]) {
        ret.path.push(cross1[0]);

        if (c) {
          const [, d1] = divideBezier3([p, c.c1, c.c2, q], cross1[2]);
          ret.curves.push({ c1: d1[1], c2: d1[2] });
        } else {
          pushC();
        }
        insideIntersections = false;
      } else if (insideIntersections) {
        // Skip segments covered by intersections.
      } else {
        pushP();
        pushC();
      }
    }
  }

  return completeBezierPath(ret);
}

/**
 * Add the first point as the last point when the last segment has curve param.
 */
function completeBezierPath(bezierPath: BezierPath): BezierPath {
  if (bezierPath.path.length > 0 && bezierPath.path.length === bezierPath.curves.length) {
    return {
      path: [...bezierPath.path, bezierPath.path[0]],
      curves: bezierPath.curves,
    };
  }

  return bezierPath;
}

// Ref: https://math.stackexchange.com/questions/4235124/getting-the-most-accurate-bezier-curve-that-plots-a-sine-wave
const v = Math.sqrt(3) * 2;
const u = (8 / 3 - Math.sqrt(3)) / 2;
export function getWavePathControl(from: IVec2, to: IVec2, waveBoundsHeight: number): BezierCurveControl {
  const halfSize = waveBoundsHeight / 2;
  const len = getDistance(from, to);
  const rotateFn = getRotateFn(getRadian(to, from));

  return {
    c1: add(from, rotateFn({ x: len * u, y: halfSize * v })),
    c2: add(from, rotateFn({ x: len * (1 - u), y: -halfSize * v })),
  };
}

export function getCornerRadiusArc(p0: IVec2, p1: IVec2, p2: IVec2, radius: number): [c: IVec2, q1: IVec2, q2: IVec2] {
  if (Math.abs(radius) < MINVALUE) return [p1, p1, p1];

  const v0 = sub(p0, p1);
  const v1 = sub(p2, p1);
  const d0 = getNorm(v0);
  const d1 = getNorm(v1);
  if (Math.abs(d0 * d1 * radius) < MINVALUE) return [p1, p1, p1];

  const u0 = multi(v0, 1 / d0);
  const u1 = multi(v1, 1 / d1);
  const rad = Math.acos(getInner(u0, u1)) / 2;
  const d = Math.min(radius / Math.tan(rad), d0, d1);
  const q0 = add(p1, multi(u0, d));
  const q1 = add(p1, multi(u1, d));
  const c = add(p1, multi(getUnit(add(u0, u1)), d / Math.cos(rad)));
  return [c, q0, q1];
}

// Ref: https://stackoverflow.com/questions/734076/how-to-best-approximate-a-geometrical-arc-with-a-bezier-curve
// This approximation works well only with arc within 90 degree.
export function getBezierControlForArc(c: IVec2, p0: IVec2, p1: IVec2): BezierCurveControl {
  const ax = p0.x - c.x;
  const ay = p0.y - c.y;
  const bx = p1.x - c.x;
  const by = p1.y - c.y;
  const divider = ax * by - ay * bx;
  if (Math.abs(divider) < MINVALUE) return { c1: p0, c2: p1 };

  const q1 = ax * ax + ay * ay;
  const q2 = q1 + ax * bx + ay * by;
  const k2 = ((4 / 3) * (Math.sqrt(2 * q1 * q2) - q2)) / divider;

  const x2 = c.x + ax - k2 * ay;
  const y2 = c.y + ay + k2 * ax;
  const x3 = c.x + bx + k2 * by;
  const y3 = c.y + by - k2 * bx;
  return { c1: { x: x2, y: y2 }, c2: { x: x3, y: y3 } };
}

export function shiftBezierCurveControl(c: BezierCurveControl, v: IVec2): BezierCurveControl {
  return { c1: add(c.c1, v), c2: add(c.c2, v) };
}

export function transformBezierPath(path: BezierPath, affine: AffineMatrix): BezierPath {
  return {
    path: path.path.map((p) => applyAffine(affine, p)),
    curves: path.curves.map((c) => (c ? transformBezierCurveControl(c, affine) : undefined)),
  };
}

export function transformBezierCurveControl(c: BezierCurveControl, affine: AffineMatrix): BezierCurveControl {
  return { c1: applyAffine(affine, c.c1), c2: applyAffine(affine, c.c2) };
}

export function getSegmentVicinityFrom(seg: ISegment, curve?: CurveControl, originDistance?: number): IVec2 {
  let vicinity = seg[1];
  if (curve) {
    if (originDistance === undefined) {
      const lerpFn = getCurveLerpFn(seg, curve);
      vicinity = lerpFn(0.01);
    } else {
      const pathStructs = getCurvePathStructs(seg, [curve]);
      vicinity = getPathPointAtLengthFromStructs(pathStructs, originDistance);
    }
  } else if (originDistance) {
    const pathStructs = getCurvePathStructs(seg);
    vicinity = getPathPointAtLengthFromStructs(pathStructs, originDistance);
  }
  return vicinity;
}

export function getSegmentVicinityTo(seg: ISegment, curve?: CurveControl, originDistance?: number): IVec2 {
  let vicinity = seg[0];
  if (curve) {
    if (originDistance === undefined) {
      const lerpFn = getCurveLerpFn(seg, curve);
      vicinity = lerpFn(0.99);
    } else {
      const pathStructs = getCurvePathStructs(seg, [curve]);
      vicinity = getPathPointAtLengthFromStructs(pathStructs, pathStructs[0].length - originDistance);
    }
  } else if (originDistance) {
    const pathStructs = getCurvePathStructs(seg);
    vicinity = getPathPointAtLengthFromStructs(pathStructs, pathStructs[0].length - originDistance);
  }
  return vicinity;
}

function getPolylinePathStruct(
  edges: ISegment[],
  curves?: (CurveControl | undefined)[],
): PathLengthStructWithApproxSize[] {
  const ret: PathLengthStructWithApproxSize[] = [];
  const approxSize = BEZIER_APPROX_SIZE;
  edges.forEach((edge, i) => {
    const curve = curves?.[i];
    if (curve) {
      if (isArcControl(curve)) {
        const arcParams = getArcCurveParamsByNormalizedControl(edge, curve.d);
        if (!arcParams) {
          ret.push({ lerpFn: getCurveLerpFn(edge), length: getPolylineLength(edge), curve: false, approxSize: 0 });
          return;
        }

        // Split the arc into 4 bezier curves.
        // => Dealing with the arc as a whole isn't much precise.
        const bezierPath = covertEllipseToBezier(
          arcParams.c,
          arcParams.radius,
          arcParams.radius,
          0,
          arcParams.from,
          arcParams.to,
          arcParams.counterclockwise,
        );
        bezierPath.path.forEach((p, i) => {
          if (i === bezierPath.path.length - 1) return;

          const lerpFn = getCurveLerpFn([p, bezierPath.path[i + 1]], bezierPath.curves?.[i]);
          ret.push({ lerpFn, length: getPolylineLength(getApproPoints(lerpFn, approxSize)), curve: true, approxSize });
        });
        return;
      }

      const lerpFn = getCurveLerpFn(edge, curve);
      ret.push({ lerpFn, length: getPolylineLength(getApproPoints(lerpFn, approxSize)), curve: true, approxSize });
    } else {
      ret.push({ lerpFn: getCurveLerpFn(edge), length: getPolylineLength(edge), curve: false, approxSize: 0 });
    }
  });
  return ret;
}

export interface PolylineEdgeInfo {
  edges: ISegment[];
  edgeLengths: number[];
  totalLength: number;
  lerpFn: (rate: number) => IVec2;
}

export function getPolylineEdgeInfo(edges: ISegment[], curves?: (CurveControl | undefined)[]): PolylineEdgeInfo {
  const pathStructs = getPolylinePathStruct(edges, curves);
  const approxEdges = pathStructs.flatMap<ISegment>((s) => {
    if (s.curve) {
      return getSegments(getApproPoints(s.lerpFn, s.approxSize));
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

export function getClosestPointOnPolyline(
  edgeInfo: PolylineEdgeInfo,
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

export function getIntersectionsBetweenLineAndPolyline(
  line: ISegment,
  edges: ISegment[],
  curves?: (CurveControl | undefined)[],
): IVec2[] {
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
      } else {
        const inter = getCrossSegAndLine(seg, line);
        if (inter) intersections.push(inter);
      }
    } else {
      const inter = getCrossSegAndLine(seg, line);
      if (inter) intersections.push(inter);
    }
  });
  return intersections;
}

export function getIntersectionsBetweenSegAndPolyline(
  seg: ISegment,
  edges: ISegment[],
  curves?: (CurveControl | undefined)[],
): IVec2[] {
  return getIntersectionsBetweenLineAndPolyline(seg, edges, curves).filter((p) => isOnSeg(p, seg));
}

export function reverseBezierPath(path: BezierPath): BezierPath {
  return {
    path: path.path.concat().reverse(),
    curves: path.curves.map((c) => (c ? { c1: c.c2, c2: c.c1 } : undefined)).reverse(),
  };
}

export function flipBezierPathV(path: BezierPath, originY: number): BezierPath {
  const t = 2 * originY;
  return {
    path: path.path.map(({ x, y }) => ({ x, y: t - y })),
    curves: path.curves.map((c) =>
      c
        ? {
            c1: { x: c.c1.x, y: t - c.c1.y },
            c2: { x: c.c2.x, y: t - c.c2.y },
          }
        : undefined,
    ),
  };
}

export function convertLinePathToSimplePath(vertices: IVec2[], curves?: (CurveControl | undefined)[]): BezierPath {
  const ret: BezierPath = { path: [], curves: [] };

  getSegments(vertices).map((seg, i) => {
    const c = curves?.[i];
    if (!c || !isArcControl(c)) {
      ret.path.push(seg[0]);
      ret.curves!.push(c);
      return;
    }

    const path = covertArcToBezier(seg, c);
    ret.path.push(...path.path.slice(0, path.path.length - 1));
    if (path.curves) ret.curves!.push(...path.curves);
  });
  ret.path.push(vertices[vertices.length - 1]);
  return ret;
}

export function covertArcToBezier(seg: ISegment, c: ArcCurveControl): BezierPath {
  const ret: BezierPath = { path: [], curves: [] };

  const arcParams = getArcCurveParamsByNormalizedControl(seg, c.d);
  if (!arcParams) {
    ret.path.push(...seg);
    ret.curves.push(undefined);
    return ret;
  }

  // Split the arc into 4 partials since bezier approximation only works well with arc within 90 degrees.
  const partials = [1, 2, 3, 4];
  const arcLerpFn = getArcLerpFn(arcParams);
  const partialSegs = getSegments([seg[0], ...partials.map((n) => arcLerpFn(n / partials.length))]);
  const partialBeziers = partialSegs.map((partialSeg) => {
    return getBezierControlForArc(arcParams.c, partialSeg[0], partialSeg[1]);
  });

  partialBeziers.forEach((partialBezier, i) => {
    const partialSeg = partialSegs[i];
    ret.path.push(partialSeg[0]);
    ret.curves.push(partialBezier);
  });
  ret.path.push(partialSegs[partialSegs.length - 1][1]);

  return ret;
}

export function covertEllipseToBezier(
  c: IVec2,
  rx: number,
  ry: number,
  rotation: number,
  from: number,
  to: number,
  counterclockwise = false,
): BezierPath {
  if (rx === 0 || ry === 0)
    return {
      path: [
        { x: c.x - rx, y: c.y - ry },
        { x: c.x + rx, y: c.y + ry },
      ],
      curves: [],
    };

  // Split the arc into 4 partials since bezier approximation only works well with arc within 90 degrees.
  const partials = [1, 2, 3, 4];
  const arcLerpFn = getArcLerpFn({
    c,
    radius: rx,
    from,
    to,
    counterclockwise,
  });
  const partialSegs = getSegments([arcLerpFn(0), ...partials.map((n) => arcLerpFn(n / partials.length))]);
  const partialBezierControls = partialSegs.map((partialSeg) => {
    return getBezierControlForArc(c, partialSeg[0], partialSeg[1]);
  });

  const arcPath: BezierPath = { path: [], curves: [] };
  partialSegs.forEach((partialSeg, i) => {
    arcPath.path.push(partialSeg[0]);
    arcPath.curves.push(partialBezierControls[i]);
  });
  arcPath.path.push(partialSegs[partialSegs.length - 1][1]);

  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);
  const affine = multiAffines([
    [1, 0, 0, 1, c.x, c.y],
    [cos, sin, -sin, cos, 0, 0],
    [1, 0, 0, ry / rx, 0, 0],
    [1, 0, 0, 1, -c.x, -c.y],
  ]);

  return transformBezierPath(arcPath, affine);
}

type SinglePath = { edge: ISegment; curve?: CurveControl };
export function splitPathAtRate(path: SinglePath, rate: number): [SinglePath, SinglePath] {
  const getSegmentResult = (): [SinglePath, SinglePath] => {
    const p = lerpPoint(path.edge[0], path.edge[1], rate);
    return [{ edge: [path.edge[0], p] }, { edge: [p, path.edge[1]] }];
  };

  if (!path.curve) {
    return getSegmentResult();
  }

  if (isBezieirControl(path.curve)) {
    const [seg0, seg1] = divideBezier3([path.edge[0], path.curve.c1, path.curve.c2, path.edge[1]], rate);
    return [
      { edge: [seg0[0], seg0[3]], curve: { c1: seg0[1], c2: seg0[2] } },
      { edge: [seg1[0], seg1[3]], curve: { c1: seg1[1], c2: seg1[2] } },
    ];
  }

  const arcParams = getArcCurveParamsByNormalizedControl(path.edge, path.curve.d);
  if (!arcParams) {
    return getSegmentResult();
  }

  const p = getArcLerpFn(arcParams)(rate);
  const seg0: ISegment = [path.edge[0], p];
  const seg1: ISegment = [p, path.edge[1]];
  const srcD = path.curve.d;
  const getDY = (seg: ISegment) => {
    return (arcParams.radius - getDistance(getCenter(seg[0], seg[1]), arcParams.c)) * Math.sign(srcD.y);
  };
  return [
    {
      edge: seg0,
      curve: { d: { x: 0.5, y: getDY(seg0) } },
    },
    {
      edge: seg1,
      curve: { d: { x: 0.5, y: getDY(seg1) } },
    },
  ];
}
