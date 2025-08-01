import {
  AffineMatrix,
  IDENTITY_AFFINE,
  IRectangle,
  IVec2,
  MINVALUE,
  add,
  circleClamp,
  clamp,
  getApproPoints,
  getBezier3LerpFn,
  getCenter,
  getCross,
  getDistance,
  getInner,
  getNorm,
  getOuterRectangle,
  getPathPointAtLengthFromStructs,
  getPathTotalLengthFromStructs,
  getPedal,
  getPolylineLength,
  getRadian,
  getRectCenter,
  interpolateVector,
  isOnSeg,
  isParallel,
  isSame,
  lerpPoint,
  multi,
  multiAffines,
  rotate,
  solveEquationOrder2,
  sub,
  vec,
} from "okageo";
import { CurveControl, Direction4, Size } from "../models";
import { pickMinItem } from "./commons";

export const BEZIER_APPROX_SIZE = 20;

export type ISegment = [IVec2, IVec2];

export type IRange = [min: number, max: number];

export type RotatedRectPath = [path: IVec2[], rotation: number];

export const TAU = Math.PI * 2;

function identityFn<T>(v: T): T {
  return v;
}

export function signedCeil(v: number): number {
  const sign = Math.sign(v);
  return sign * Math.ceil(Math.abs(v));
}

export function getD2(v: IVec2): number {
  return v.x * v.x + v.y * v.y;
}

export function isSameSize(a: Size, b: Size): boolean {
  return Math.abs(a.width - b.width) < MINVALUE && Math.abs(a.height - b.height) < MINVALUE;
}

export function divideSafely(dividee: number, divider: number, fallback: number): number {
  return divider === 0 ? fallback : dividee / divider;
}

export function getRotateFn(radian: number, origin?: IVec2): (p: IVec2, reverse?: boolean) => IVec2 {
  if (radian === 0) return identityFn;

  const sin = Math.sin(radian);
  const cos = Math.cos(radian);
  return (p: IVec2, reverse = false) => {
    const v = origin ? sub(p, origin) : p;
    const rotatedV = reverse
      ? { x: v.x * cos + v.y * sin, y: -v.x * sin + v.y * cos }
      : { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
    return origin ? add(rotatedV, origin) : rotatedV;
  };
}

export function getRadianForDirection4(direction: Direction4): number {
  switch (direction) {
    case 0:
      return -Math.PI / 2;
    case 2:
      return Math.PI / 2;
    case 3:
      return Math.PI;
    default:
      return 0;
  }
}

/**
 * Returns equivalent radian inside the range: [-pi, pi]
 */
export function normalizeRadian(value: number): number {
  return circleClamp(-Math.PI, Math.PI, value);
}

export function isSameValue(a: number, b: number): boolean {
  return Math.abs(a - b) < MINVALUE;
}

export function getSegments(points: IVec2[], close = false): ISegment[] {
  const ret: ISegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    ret.push([points[i], points[i + 1]]);
  }
  if (close && !isSame(points[0], points[points.length - 1])) {
    ret.push([points[points.length - 1], points[0]]);
  }
  return ret;
}

export function extendSegment(seg: ISegment, rate: number): ISegment {
  const v = sub(seg[1], seg[0]);
  return [seg[0], add(seg[0], multi(v, rate))];
}

export function expandRect(rect: IRectangle, padding: number): IRectangle {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

export function expandRectByScale(rect: IRectangle, scale: number): IRectangle {
  const nextW = rect.width * scale;
  const nextH = rect.height * scale;
  return {
    x: rect.x - (nextW - rect.width) / 2,
    y: rect.y - (nextH - rect.height) / 2,
    width: nextW,
    height: nextH,
  };
}

export function translateRect(rect: IRectangle, v: IVec2): IRectangle {
  return {
    x: rect.x + v.x,
    y: rect.y + v.y,
    width: rect.width,
    height: rect.height,
  };
}

export function getPathTotalLength(points: IVec2[], closed = false): number {
  if (points.length < 2) return 0;

  let ret = 0;
  for (let i = 0; i < points.length - 1; i++) {
    ret += getDistance(points[i], points[i + 1]);
  }

  if (closed) {
    ret += getDistance(points[points.length - 1], points[0]);
  }

  return ret;
}

export function isPointOnRectangle(rect: IRectangle, p: IVec2): boolean {
  return rect.x <= p.x && p.x <= rect.x + rect.width && rect.y <= p.y && p.y <= rect.y + rect.height;
}

export function isPointOnRectangleRotated(rect: IRectangle, rotation: number, p: IVec2): boolean {
  const rotatedP = rotation === 0 ? p : rotate(p, -rotation, getRectCenter(rect));
  return isPointOnRectangle(rect, rotatedP);
}

export function getClosestOutlineOnRectangle(rect: IRectangle, p: IVec2, threshold: number): IVec2 | undefined {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  let candidate: IVec2 | undefined = undefined;
  let d = Math.max(rect.width, rect.height);

  if (rect.y <= p.y && p.y <= bottom) {
    const dxl = Math.abs(p.x - rect.x);
    if (dxl <= threshold && dxl < d) {
      candidate = { x: rect.x, y: p.y };
      d = dxl;
    }

    const dxr = Math.abs(p.x - right);
    if (dxr <= threshold && dxr < d) {
      candidate = { x: right, y: p.y };
      d = dxr;
    }
  }

  if (rect.x <= p.x && p.x <= right) {
    const dyt = Math.abs(p.y - rect.y);
    if (dyt <= threshold && dyt < d) {
      candidate = { x: p.x, y: rect.y };
      d = dyt;
    }

    const dyb = Math.abs(p.y - bottom);
    if (dyb <= threshold && dyb < d) {
      candidate = { x: p.x, y: bottom };
      d = dyb;
    }
  }

  return candidate;
}

export function getClosestOutlineOnEllipse(
  c: IVec2,
  rx: number,
  ry: number,
  p: IVec2,
  threshold?: number,
): IVec2 | undefined {
  const np = sub(p, c);
  const r = getRadian({ x: np.x / rx, y: np.y / ry });
  const x = c.x + Math.cos(r) * rx;
  const y = c.y + Math.sin(r) * ry;
  const ep = { x, y };
  if (threshold === undefined) return ep;

  return getDistance(ep, p) <= threshold ? ep : undefined;
}

export function getClosestOutlineOnArc(
  c: IVec2,
  rx: number,
  ry: number,
  from: number,
  to: number,
  p: IVec2,
  threshold?: number,
): IVec2 | undefined {
  const np = sub(p, c);
  const r = getRadian({ x: np.x / rx, y: np.y / ry });
  if (!isRadianInside(normalizeRadian(from), normalizeRadian(to), r)) return;

  const x = c.x + Math.cos(r) * rx;
  const y = c.y + Math.sin(r) * ry;
  const ep = { x, y };
  if (threshold === undefined) return ep;

  return getDistance(ep, p) <= threshold ? ep : undefined;
}

export function getClosestOutlineOnPolygon(path: IVec2[], p: IVec2, threshold: number): IVec2 | undefined {
  let candidate: IVec2 | undefined = undefined;
  let d = Infinity;

  for (let i = 0; i < path.length; i++) {
    const seg = [path[i], path[i + 1 < path.length ? i + 1 : 0]];
    const pedal = getPedal(p, seg);
    const v = getD2(sub(pedal, p));
    if (v < d && isOnSeg(pedal, seg)) {
      candidate = pedal;
      d = v;
    }
  }
  if (!candidate || d === undefined || threshold < Math.sqrt(d)) return;

  return candidate;
}

export function getIntersectedOutlinesOnPolygon(polygon: IVec2[], from: IVec2, to: IVec2): IVec2[] | undefined {
  const seg: ISegment = [from, to];
  const ret: [IVec2, d: number][] = [];

  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    const s = getCrossSegAndSeg([p, q], seg);
    if (!s) return;
    ret.push([s, getD2(sub(s, from))]);
  });

  return ret.length === 0 ? undefined : ret.sort((a, b) => a[1] - b[1]).map(([s]) => s);
}

export function getMarkersOnPolygon(path: IVec2[]): IVec2[] {
  const ret: IVec2[] = [];
  for (let i = 0; i < path.length; i++) {
    ret.push(path[i], getCenter(path[i], path[i + 1 < path.length ? i + 1 : 0]));
  }
  return ret;
}

export function isPointOnEllipse(c: IVec2, rx: number, ry: number, p: IVec2): boolean {
  const dx = c.x - p.x;
  const dy = c.y - p.y;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

export function isPointOnEllipseRotated(c: IVec2, rx: number, ry: number, rotation: number, p: IVec2): boolean {
  const rotatedP = rotation === 0 ? p : rotate(p, -rotation, c);
  return isPointOnEllipse(c, rx, ry, rotatedP);
}

/**
 * When "from" is equal to "to", the arc becomes ellipse.
 */
export function isPointOnArcRotated(
  c: IVec2,
  rx: number,
  ry: number,
  rotation: number,
  from: number,
  to: number,
  p: IVec2,
): boolean {
  const rotatedP = rotation === 0 ? p : rotate(p, -rotation, c);
  if (!isPointOnEllipse(c, rx, ry, rotatedP)) return false;
  const adjusted = { x: (rotatedP.x - c.x) / rx, y: (rotatedP.y - c.y) / ry };
  return isRadianInside(normalizeRadian(from), normalizeRadian(to), getRadian(adjusted));
}

export function isOnDonutArc(
  c: IVec2,
  rx: number,
  ry: number,
  rotation: number,
  from: number,
  to: number,
  holeRate: number,
  p: IVec2,
) {
  return (
    isPointOnArcRotated(c, rx, ry, rotation, from, to, p) &&
    (holeRate === 0 || !isPointOnEllipseRotated(c, rx * holeRate, ry * holeRate, rotation, p))
  );
}

export function getCrossLineAndEllipse(line: ISegment, c: IVec2, rx: number, ry: number): IVec2[] | undefined {
  const centeredLine = [sub(line[0], c), sub(line[1], c)];

  if (Math.abs(centeredLine[0].x - centeredLine[1].x) < MINVALUE) {
    const x = centeredLine[0].x;
    if (x < -rx || rx < x) return;

    const y = ry * Math.sqrt(1 - (x * x) / (rx * rx));
    return (
      y === 0
        ? [{ x, y }]
        : [
            { x, y },
            { x, y: -y },
          ]
    ).map((p) => add(p, c));
  }

  const m = (centeredLine[1].y - centeredLine[0].y) / (centeredLine[1].x - centeredLine[0].x);
  const m2 = m * m;
  const k = centeredLine[0].y - m * centeredLine[0].x;
  const k2 = k * k;
  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const A = rx2 * m2 + ry2;
  const B = 2 * rx2 * m * k;
  const C = rx2 * (k2 - ry2);
  const res = solveEquationOrder2(A, B, C);
  if (res.length === 0) return;

  return res.map((x) => ({ x, y: x * m + k })).map((p) => add(p, c));
}

export function getCrossLineAndEllipseRotated(
  line: ISegment,
  c: IVec2,
  rx: number,
  ry: number,
  rotation: number,
): IVec2[] | undefined {
  const rotateFn = getRotateFn(-rotation, c);
  const rotatedLine: ISegment = [rotateFn(line[0]), rotateFn(line[1])];
  return getCrossLineAndEllipse(rotatedLine, c, rx, ry)?.map((p) => rotateFn(p, true));
}

export function getCrossLineAndArcRotated(
  line: ISegment,
  c: IVec2,
  rx: number,
  ry: number,
  rotation: number,
  from: number,
  to: number,
): IVec2[] | undefined {
  const candidate = getCrossLineAndEllipseRotated(line, c, rx, ry, rotation);
  if (!candidate) return;

  const nfrom = normalizeRadian(from);
  const nto = normalizeRadian(to);
  const result = candidate.filter((p) => {
    return isRadianInside(nfrom, nto, normalizeRadian(getRadian(p, c) - rotation));
  });
  return result.length > 0 ? result : undefined;
}

export function getWrapperRect(rects: IRectangle[]): IRectangle {
  const xList = rects.flatMap((r) => [r.x, r.x + r.width]);
  const yList = rects.flatMap((r) => [r.y, r.y + r.height]);
  const xMin = Math.min(...xList);
  const xMax = Math.max(...xList);
  const yMin = Math.min(...yList);
  const yMax = Math.max(...yList);
  return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
}

export function getRectPoints(rect: IRectangle): IVec2[] {
  const x0 = rect.x;
  const x1 = rect.x + rect.width;
  const y0 = rect.y;
  const y1 = rect.y + rect.height;
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

export function getRectFeaturePoints(rect: IRectangle): IVec2[] {
  const [tl, tr, br, bl] = getRectPoints(rect);
  const c = getCenter(tl, br);
  const [tc, cr, bc, cl] = [
    { x: c.x, y: tl.y },
    { x: tr.x, y: c.y },
    { x: c.x, y: bl.y },
    { x: tl.x, y: c.y },
  ];
  return [tl, tc, tr, cr, br, bc, bl, cl, c];
}

export function getRectLines(rect: IRectangle): [IVec2, IVec2][] {
  const [tl, tr, br, bl] = getRectPoints(rect);
  return [
    [tl, tr],
    [tr, br],
    [br, bl],
    [bl, tl],
  ];
}

export function getRectCenterLines(rect: IRectangle): [v: IVec2, h: IVec2][] {
  const [tl, tr, , bl] = getRectPoints(rect);
  const cx = (tl.x + tr.x) / 2;
  const cy = (tl.y + bl.y) / 2;
  return [
    [
      { x: cx, y: tl.y },
      { x: cx, y: bl.y },
    ],
    [
      { x: tl.x, y: cy },
      { x: tr.x, y: cy },
    ],
  ];
}

export function getRotatedWrapperRect(rect: IRectangle, rotation: number): IRectangle {
  if (rotation === 0) return rect;

  const c = getRectCenter(rect);
  return getOuterRectangle([getRectPoints(rect).map((p) => rotate(p, rotation, c))]);
}

export function getRotatedWrapperRectAt(rect: IRectangle, rotation: number, origin: IVec2): IRectangle {
  if (rotation === 0) return rect;
  return getOuterRectangle([getRectPoints(rect).map((p) => rotate(p, rotation, origin))]);
}

/**
 * Suppose "rectPolygon" composes a rectangle.
 * => [tl, tr, br, bl]
 */
export function getRectWithRotationFromRectPolygon(rectPolygon: IVec2[]): [rect: IRectangle, rotation: number] {
  const r = getRectPathRotation(rectPolygon);
  if (r === 0) {
    return [
      {
        x: rectPolygon[0].x,
        y: rectPolygon[0].y,
        width: rectPolygon[1].x - rectPolygon[0].x,
        height: rectPolygon[3].y - rectPolygon[0].y,
      },
      0,
    ];
  }

  const c = getCenter(rectPolygon[0], rectPolygon[2]);
  const p = rotate(rectPolygon[0], -r, c);
  return [
    {
      x: p.x,
      y: p.y,
      width: getDistance(rectPolygon[0], rectPolygon[1]),
      height: getDistance(rectPolygon[0], rectPolygon[3]),
    },
    r,
  ];
}

export function getWrapperRectWithRotationFromPoints(
  points: IVec2[],
  rotation: number,
): [rect: IRectangle, rotation: number] {
  const outerRect = getOuterRectangle([points]);
  if (rotation === 0) {
    return [outerRect, 0];
  }

  const c = getRectCenter(outerRect);
  const rotateFn = getRotateFn(rotation, c);
  const rotatedPoints = points.map((p) => rotateFn(p, true));
  const rotatedOuterRect = getOuterRectangle([rotatedPoints]);

  return [rotatedOuterRect, rotation];
}

// When the pedal point isn't on the segment, this always returns false.
export function isPointCloseToSegment(seg: IVec2[], p: IVec2, threshold: number): boolean {
  const pedal = getPedal(p, seg);
  const d = getDistance(p, pedal);
  if (d > threshold) return false;

  return isOnSeg(pedal, seg);
}

export function getClosestPointOnSegment(seg: IVec2[], p: IVec2): IVec2 {
  const pedal = getPedal(p, seg);
  if (isOnSeg(pedal, seg)) return pedal;

  const d0 = getD2(sub(p, seg[0]));
  const d1 = getD2(sub(p, seg[1]));
  return d0 <= d1 ? seg[0] : seg[1];
}

// Likewise "isPointCloseToSegment"
export function isPointCloseToCurveSpline(
  points: IVec2[],
  controls: (CurveControl | undefined)[] = [],
  p: IVec2,
  threshold: number,
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const seg: ISegment = [points[i], points[i + 1]];
    const control = controls[i];
    let hit = false;
    if (!control) {
      hit = isPointCloseToSegment(seg, p, threshold);
    } else if ("d" in control) {
      const arcParams = getArcCurveParamsByNormalizedControl(seg, control.d);
      if (arcParams) {
        hit = isPointCloseToArc(arcParams, p, threshold);
      } else {
        hit = isPointCloseToSegment(seg, p, threshold);
      }
    } else {
      hit = isPointCloseToBezierSegment(seg[0], seg[1], control.c1, control.c2, p, threshold);
    }

    if (hit) return true;
  }
  return false;
}

export function isPointCloseToBezierSegment(
  p1: IVec2,
  p2: IVec2,
  c1: IVec2,
  c2: IVec2,
  p: IVec2,
  threshold: number,
): boolean {
  const bezier = [p1, c1, c2, p2];
  // The point should be inside the bounds of the bezier points at least.
  const bounds = expandRect(getOuterRectangle([bezier]), threshold);
  if (!isPointOnRectangle(bounds, p)) return false;

  const lerpFn = getBezier3LerpFn(bezier as [IVec2, IVec2, IVec2, IVec2]);
  const size = BEZIER_APPROX_SIZE;
  const step = 1 / size;
  for (let i = 0; i < size; i++) {
    const seg = [lerpFn(step * i), lerpFn(step * (i + 1))];
    if (isPointCloseToSegment(seg, p, threshold)) return true;
  }
  return false;
}

export function logRound(log: number, val: number) {
  const pow = Math.pow(10, -log);
  return Math.round(val * pow) / pow;
}

export function logRoundByDigit(digitCount: number, val: number) {
  const absint = Math.abs(Math.round(val));
  const sign = Math.sign(val);
  const d = absint.toString().length;
  return d >= digitCount ? absint * sign : logRound(d - digitCount, val);
}

export function snapAngle(rotate: number, angle = 15): number {
  return snapNumber(rotate, angle);
}

export function snapRadianByAngle(rad: number, angle = 15): number {
  return (snapNumber((rad * 180) / Math.PI, angle) * Math.PI) / 180;
}

export function snapScale(scale: IVec2, step = 0.1): IVec2 {
  return {
    x: snapNumber(scale.x, step),
    y: snapNumber(scale.y, step),
  };
}

export function snapNumber(value: number, step = 1): number {
  return Math.round(value / step) * step;
}

export function snapNumberFloor(value: number, step = 1): number {
  return Math.floor(value / step) * step;
}

export function snapNumberCeil(value: number, step = 1): number {
  return Math.ceil(value / step) * step;
}

export function sortNumFn(a: number, b: number): number {
  return a - b;
}

export function isRangeAccommodatingValue(range: [number, number], v: number): boolean {
  const [a0, a1] = range.toSorted(sortNumFn);
  return a0 <= v && v <= a1;
}

export function isRangeOverlapped(a: [number, number], b: [number, number]): boolean {
  const [a0, a1] = [a[0], a[1]].sort(sortNumFn);
  const [b0, b1] = [b[0], b[1]].sort(sortNumFn);

  return !(a1 < b0 || b1 < a0);
}

export function isSegmentOverlappedH(a: ISegment, b: ISegment): boolean {
  return isRangeOverlapped([a[0].y, a[1].y], [b[0].y, b[1].y]);
}

export function isSegmentOverlappedV(a: ISegment, b: ISegment): boolean {
  return isRangeOverlapped([a[0].x, a[1].x], [b[0].x, b[1].x]);
}

export function isRectOverlappedH(a: IRectangle, b: IRectangle): boolean {
  return isRangeOverlapped([a.y, a.y + a.height], [b.y, b.y + b.height]);
}

export function isRectOverlappedV(a: IRectangle, b: IRectangle): boolean {
  return isRangeOverlapped([a.x, a.x + a.width], [b.x, b.x + b.width]);
}

export function isRectOverlapped(a: IRectangle, b: IRectangle): boolean {
  return isRectOverlappedH(a, b) && isRectOverlappedV(a, b);
}

/**
 * Returns a rectangle only when it has non-zero area.
 */
export function getOverlappedAreaOfRects(rects: IRectangle[]): IRectangle | undefined {
  if (rects.length === 0) return;

  let x = -Infinity;
  let y = -Infinity;
  let right = Infinity;
  let bottom = Infinity;
  rects.forEach((r) => {
    x = Math.max(x, r.x);
    y = Math.max(y, r.y);
    right = Math.min(right, r.x + r.width);
    bottom = Math.min(bottom, r.y + r.height);
  });
  const width = right - x;
  const height = bottom - y;
  return width > 0 && height > 0 ? { x, y, width, height } : undefined;
}

export function getCrossLineAndLine(line0: IVec2[], line1: IVec2[]): IVec2 | undefined {
  if (isParallel(sub(line0[0], line0[1]), sub(line1[0], line1[1]))) return;

  const s1 =
    ((line1[1].x - line1[0].x) * (line0[0].y - line1[0].y) - (line1[1].y - line1[0].y) * (line0[0].x - line1[0].x)) / 2;
  const s2 =
    ((line1[1].x - line1[0].x) * (line1[0].y - line0[1].y) - (line1[1].y - line1[0].y) * (line1[0].x - line0[1].x)) / 2;
  const rate = s1 / (s1 + s2);
  return vec(line0[0].x + (line0[1].x - line0[0].x) * rate, line0[0].y + (line0[1].y - line0[0].y) * rate);
}

export function getCrossSegAndSeg(seg0: ISegment, seg1: ISegment): IVec2 | undefined {
  return getCrossSegAndSegWithT(seg0, seg1)?.[0];
}

/**
 * Returns the intersection and rate of it on each segment.
 */
export function getCrossSegAndSegWithT(seg0: ISegment, seg1: ISegment): [IVec2, t0: number, t1: number] | undefined {
  const p = seg0[0];
  const v = sub(seg0[1], seg0[0]);
  const q = seg1[0];
  const u = sub(seg1[1], seg1[0]);
  const invCross = 1 / getCross(v, u);
  const t = getCross(sub(q, p), multi(u, invCross));
  const s = getCross(sub(p, q), multi(v, -invCross));
  return 0 <= t && t <= 1 && 0 <= s && s <= 1 ? [add(p, multi(v, t)), t, s] : undefined;
}

export function sortPointFrom(p: IVec2, points: IVec2[]): IVec2[] {
  return points
    .map<[number, IVec2]>((v) => {
      const dx = v.x - p.x;
      const dy = v.y - p.y;
      return [dx * dx + dy * dy, v];
    })
    .sort((a, b) => a[0] - b[0])
    .map((v) => v[1]);
}

export function getClosestPointTo(to: IVec2, points: IVec2[]): IVec2 | undefined {
  return pickMinItem(points, (p) => getD2(sub(p, to)));
}

export function getLocationRateOnRectPath(rectPath: IVec2[], rotation: number, p: IVec2): IVec2 {
  const center = getCenter(rectPath[0], rectPath[2]);
  const rotatedP = rotate(p, -rotation, center);
  const rotatedPath = rectPath.map((v) => rotate(v, -rotation, center));
  const dw = rotatedPath[1].x - rotatedPath[0].x;
  const dh = rotatedPath[3].y - rotatedPath[0].y;
  return {
    x: dw === 0 ? 0 : (rotatedP.x - rotatedPath[0].x) / dw,
    y: dh === 0 ? 0 : (rotatedP.y - rotatedPath[0].y) / dh,
  };
}

export function getLocationFromRateOnRectPath(rectPath: IVec2[], rotation: number, rate: IVec2): IVec2 {
  const center = getCenter(rectPath[0], rectPath[2]);
  const rotatedPath = rectPath.map((v) => rotate(v, -rotation, center));
  const width = rotatedPath[1].x - rotatedPath[0].x;
  const height = rotatedPath[3].y - rotatedPath[0].y;
  const rotatedP = { x: rotatedPath[0].x + width * rate.x, y: rotatedPath[0].y + height * rate.y };
  return rotate(rotatedP, rotation, center);
}

export function getIsRectHitRectFn(range: IRectangle): (target: IRectangle) => boolean {
  const r = range.x + range.width;
  const b = range.y + range.height;
  return (target) =>
    !(r < target.x || b < target.y || target.x + target.width < range.x || target.y + target.height < range.y);
}

export function getRelativePointOnPath(path: IVec2[], rate: number): IVec2 {
  if (path.length <= 1) return path[0];

  const edges: ISegment[] = [];
  path.map((v, i) => {
    if (i < path.length - 1) edges.push([v, path[i + 1]]);
  });
  const list = edges.map((s) => getDistance(s[0], s[1]));
  const total = list.reduce((p, d) => p + d, 0);
  const targetRate = clamp(0, 1, rate);
  const targetLength = total * targetRate;

  let targetIndex = 0;
  let stack = 0;
  list.some((d, i) => {
    targetIndex = i;
    if (stack + d < targetLength) {
      stack += d;
    } else {
      return true;
    }
  });

  const remain = targetLength - stack;
  return interpolateVector(edges[targetIndex][0], edges[targetIndex][1], remain / list[targetIndex]);
}

export function getRelativePointOnCurvePath(
  points: IVec2[],
  controls: (CurveControl | undefined)[] = [],
  rate: number,
): IVec2 {
  if (points.length <= 1) return points[0];
  if (controls.length === 0) return getRelativePointOnPath(points, rate);

  const pathStructs = getCurvePathStructs(points, controls);
  return getRelativePointOnCurvePathFromStruct(pathStructs, rate);
}

export function getRelativePointOnCurvePathFromStruct(pathStructs: CurvePathStruct[], rate: number): IVec2 {
  const totalLength = getPathTotalLengthFromStructs(pathStructs);
  return getPathPointAtLengthFromStructs(pathStructs, totalLength * rate);
}

type CurvePathStruct = {
  lerpFn: (t: number) => IVec2;
  length: number;
  curve?: boolean;
};

export function getCurvePathStructs(points: IVec2[], controls: (CurveControl | undefined)[] = []): CurvePathStruct[] {
  if (points.length <= 1) return [];

  const pathStructs: CurvePathStruct[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const seg: ISegment = [points[i], points[i + 1]];
    const c = controls[i];
    const lerpFn = getCurveLerpFn(seg, c);
    if (!c) {
      const length = getDistance(seg[0], seg[1]);
      pathStructs.push({ lerpFn, length });
    } else {
      const length = getPolylineLength(getApproPoints(lerpFn, BEZIER_APPROX_SIZE));
      pathStructs.push({ lerpFn, length, curve: true });
    }
  }
  return pathStructs;
}

export function getRotatedRectAffine(rect: IRectangle, rotation: number) {
  const width = rect.width;
  const height = rect.height;
  const center = getRectCenter(rect);
  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);

  return multiAffines([
    [1, 0, 0, 1, center.x, center.y],
    [cos, sin, -sin, cos, 0, 0],
    [1, 0, 0, 1, -width / 2, -height / 2],
  ]);
}

/**
 * Returns inverted affine of "getRotatedRectAffine".
 */
export function getRotatedRectAffineInverse(rect: IRectangle, rotation: number) {
  const width = rect.width;
  const height = rect.height;
  const center = getRectCenter(rect);
  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);

  return multiAffines([
    [1, 0, 0, 1, width / 2, height / 2],
    [cos, -sin, sin, cos, 0, 0],
    [1, 0, 0, 1, -center.x, -center.y],
  ]);
}

export function getRotatedAtAffine(origin: IVec2, rotation: number) {
  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);

  return multiAffines([
    [1, 0, 0, 1, origin.x, origin.y],
    [cos, sin, -sin, cos, 0, 0],
    [1, 0, 0, 1, -origin.x, -origin.y],
  ]);
}

export function getDistanceBetweenPointAndRect(p: IVec2, rect: IRectangle): number {
  if (isPointOnRectangle(rect, p)) return 0;

  let ret = Infinity;
  let closeToSegment = false;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  if (rect.x <= p.x && p.x <= right) {
    ret = Math.min(ret, Math.abs(p.y - rect.y), Math.abs(bottom - p.y));
    closeToSegment = true;
  }
  if (rect.y <= p.y && p.y <= bottom) {
    ret = Math.min(ret, Math.abs(p.x - rect.x), Math.abs(right - p.x));
    closeToSegment = true;
  }

  if (!closeToSegment) {
    if (p.x < rect.x && p.y < rect.y) {
      ret = getDistance(p, rect);
    } else if (right < p.x && p.y < rect.y) {
      ret = getDistance(p, { x: right, y: rect.y });
    } else if (right < p.x && bottom < p.y) {
      ret = getDistance(p, { x: right, y: bottom });
    } else {
      ret = getDistance(p, { x: rect.x, y: bottom });
    }
  }

  return ret;
}

export function getRotationAffines(rotation: number, origin: IVec2) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    rotateAffine: multiAffines([
      [1, 0, 0, 1, origin.x, origin.y],
      [cos, sin, -sin, cos, 0, 0],
      [1, 0, 0, 1, -origin.x, -origin.y],
    ]),
    derotateAffine: multiAffines([
      [1, 0, 0, 1, origin.x, origin.y],
      [cos, -sin, sin, cos, 0, 0],
      [1, 0, 0, 1, -origin.x, -origin.y],
    ]),
  };
}

export function getRotationAffine(rotation: number, origin?: IVec2) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const ra: AffineMatrix = [cos, sin, -sin, cos, 0, 0];
  if (!origin) return ra;

  return multiAffines([[1, 0, 0, 1, origin.x, origin.y], ra, [1, 0, 0, 1, -origin.x, -origin.y]]);
}

export function getCurveSplineBounds(points: IVec2[], controls: (CurveControl | undefined)[] = []): IRectangle {
  const segments = getSegments(points);
  const rects = segments.map((seg, i) => {
    const control = controls[i];
    if (!control) {
      return getOuterRectangle([seg]);
    } else if ("d" in control) {
      const params = getArcCurveParamsByNormalizedControl(seg, control.d);
      return params ? getArcBounds(params) : getOuterRectangle([seg]);
    } else {
      return getBezierBounds(seg[0], seg[1], control.c1, control.c2);
    }
  });
  return getWrapperRect(rects);
}

export function getBezierBounds(v1: IVec2, v2: IVec2, c1: IVec2, c2: IVec2): IRectangle {
  const left = getBezierMinValue(v1.x, v2.x, c1.x, c2.x);
  const right = getBezierMaxValue(v1.x, v2.x, c1.x, c2.x);
  const top = getBezierMinValue(v1.y, v2.y, c1.y, c2.y);
  const bottom = getBezierMaxValue(v1.y, v2.y, c1.y, c2.y);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function getBezierMinValue(v1: number, v2: number, c1: number, c2: number): number {
  const minV = Math.min(v1, v2);
  if (minV <= c1 && minV <= c2) {
    // The target point is at a vertex.
    return minV;
  } else {
    // The target point is on the curve.
    const [a, b, c] = getBezierDerivative(v1, v2, c1, c2);
    const valued = solveEquationOrder2(a, b, c).filter((v) => 0 < v && v < 1);
    return Math.min(minV, ...valued.map((v) => getBezierValue(v1, v2, c1, c2, v)));
  }
}

export function getBezierMaxValue(v1: number, v2: number, c1: number, c2: number): number {
  const maxV = Math.max(v1, v2);
  if (c1 <= maxV && c2 <= maxV) {
    // The target point is at a vertex.
    return maxV;
  } else {
    // The target point is on the curve.
    const [a, b, c] = getBezierDerivative(v1, v2, c1, c2);
    const valued = solveEquationOrder2(a, b, c).filter((v) => 0 < v && v < 1);
    return Math.max(maxV, ...valued.map((v) => getBezierValue(v1, v2, c1, c2, v)));
  }
}

function getBezierDerivative(v1: number, v2: number, c1: number, c2: number): [a: number, b: number, c: number] {
  const d1 = c1 - v1;
  const d2 = c2 - c1;
  const d3 = v2 - c2;
  const a = 3 * d1 - 6 * d2 + 3 * d3;
  const b = -6 * d1 + 6 * d2;
  const c = 3 * d1;
  return [a, b, c];
}

function getBezierValue(v1: number, v2: number, c1: number, c2: number, t: number): number {
  const nt = 1 - t;
  return v1 * nt * nt * nt + 3 * c1 * t * nt * nt + 3 * c2 * t * t * nt + v2 * t * t * t;
}

/**
 * These parameters are compatible to HTML canvas "arc" method.
 * => "from" and "to" reprenset absolete positions on the circumference.
 * ex) from:0, to: -pi/2 => The curve still should be clockwise.
 */
interface ArcCurveParams {
  c: IVec2;
  radius: number;
  from: number;
  to: number;
  counterclockwise?: boolean;
  largearc?: boolean;
}

/**
 * Returns parameters of the arc that
 * - starts from "segment[0]" to "segment[1]"
 * - passes through the point the same distance away from "segment" as "control"
 * Calculation ref: https://github.com/miyanokomiya/no-mans-folly/issues/6
 *
 * Returns undefined when no arc exists for given arguments.
 */
export function getArcCurveParams(segment: ISegment, control: IVec2): ArcCurveParams | undefined {
  const rotation = getRadian(segment[1], segment[0]);
  const rotateFn = getRotateFn(rotation);
  const nQ = rotateFn(sub(control, segment[0]), true);
  return getArcCurveParamsByNormalizedControl(segment, nQ);
}

export function getArcCurveParamsByNormalizedControl(segment: ISegment, nQ: IVec2): ArcCurveParams | undefined {
  const rotation = getRadian(segment[1], segment[0]);
  const rotateFn = getRotateFn(rotation);

  const nP = rotateFn(sub(segment[1], segment[0]), true);
  // Treat as a circule when the segment has zero length
  if (Math.abs(nP.x) < MINVALUE) {
    const rad = getRadian(nQ);
    return {
      c: add({ x: nQ.x / 2, y: nQ.y / 2 }, segment[0]),
      radius: getNorm(nQ) / 2,
      from: rad - Math.PI,
      to: rad + Math.PI,
      largearc: true,
    };
  }

  // No arc exists when three points are on the same line.
  if (Math.abs(nQ.y) < MINVALUE) return;

  const dx = nP.x;
  const dy = nQ.y;
  const r1 = Math.atan2(dy, dx / 2);
  const r3 = 2 * r1 - Math.PI / 2;
  const radiusRaw = dx / 2 / Math.cos(r3);
  const nC = { x: dx / 2, y: dy - radiusRaw };
  const nFrom = Math.atan2(-nC.y, -nC.x);
  const nTo = Math.atan2(-nC.y, nC.x);

  const radius = Math.abs(radiusRaw);
  return {
    c: add(rotateFn(nC), segment[0]),
    radius,
    from: nFrom + rotation,
    to: nTo + rotation,
    counterclockwise: nQ.y > 0,
    largearc: Math.abs(nQ.y) > radius,
  };
}

export function getRadianRangeOfArcCurveParams(
  params: Pick<ArcCurveParams, "to" | "from" | "counterclockwise">,
): number {
  const to = params.counterclockwise ? params.from : params.to;
  const from = params.counterclockwise ? params.to : params.from;
  const pto = to >= from ? to : to + TAU;
  const nDiffR = pto - from;
  return nDiffR >= 0 ? nDiffR : nDiffR + TAU;
}

export function normalizeSegment(segment: ISegment): ISegment {
  const rotation = getRadian(segment[1], segment[0]);
  return [{ x: 0, y: 0 }, rotate(sub(segment[1], segment[0]), -rotation)];
}

export function getArcLerpFn({ c, radius, to, from, counterclockwise }: ArcCurveParams): (t: number) => IVec2 {
  const nt = to < from ? to + TAU : to;
  const [min, max] = counterclockwise ? [nt, from + TAU] : [from, nt];
  const range = max - min;

  return (t) => {
    const r = counterclockwise ? range * (1 - t) + min : range * t + min;
    return add(vec(radius * Math.cos(r), radius * Math.sin(r)), c);
  };
}

export function getCurveLerpFn(segment: ISegment, control?: CurveControl | undefined): (t: number) => IVec2 {
  if (!control) {
    return (t) => lerpPoint(segment[0], segment[1], t);
  } else if ("d" in control) {
    const arcParams = getArcCurveParamsByNormalizedControl(segment, control.d);
    if (arcParams) {
      return getArcLerpFn(arcParams);
    } else {
      return (t) => lerpPoint(segment[0], segment[1], t);
    }
  } else {
    return getBezier3LerpFn([segment[0], control.c1, control.c2, segment[1]]);
  }
}

export function getApproxCurvePoints(points: IVec2[], controls: (CurveControl | undefined)[] = []): IVec2[] {
  return getApproxCurvePointsFromStruct(getCurvePathStructs(points, controls)).map(([p]) => p);
}

export function getApproxCurvePointsFromStruct(
  curvePathStructs: CurvePathStruct[],
): [p: IVec2, index: number, t: number, split: number][] {
  if (curvePathStructs.length === 0) return [];

  const approxSize = BEZIER_APPROX_SIZE;
  const ret: [p: IVec2, index: number, t: number, split: number][] = [
    [curvePathStructs[0].lerpFn(0), 0, 0, curvePathStructs[0].curve ? approxSize : 1],
  ];

  curvePathStructs.forEach((s, i) => {
    const isLastItem = i === curvePathStructs.length - 1;
    const nextIndex = isLastItem ? i : i + 1;
    const nextApproxSize = curvePathStructs[nextIndex].curve ? approxSize : 1;
    // Use the first value of the next item instead of the last value of this item.
    // When this item is the last one, use the last value of it.
    const tailItem: [p: IVec2, index: number, t: number, split: number] = [
      s.lerpFn(1),
      nextIndex,
      isLastItem ? 1 : 0,
      nextApproxSize,
    ];

    if (s.curve) {
      for (let k = 1; k <= approxSize; k++) {
        if (k === approxSize) {
          ret.push(tailItem);
        } else {
          const t = k / approxSize;
          ret.push([s.lerpFn(t), i, t, approxSize]);
        }
      }
    } else {
      ret.push(tailItem);
    }
  });

  return ret;
}

export function getArcBounds({ c, radius, to, from, counterclockwise }: ArcCurveParams): IRectangle {
  return getGeneralArcBounds(c, radius, radius, to, from, counterclockwise);
}

export function getGeneralArcBounds(
  c: IVec2,
  rx: number,
  ry: number,
  to: number,
  from: number,
  counterclockwise = false,
): IRectangle {
  const [f, t] = counterclockwise ? [to, from] : [from, to];
  const nfrom = normalizeRadian(f);
  const nto = normalizeRadian(t);
  if (Math.abs(nto - nfrom) < MINVALUE) {
    return {
      x: c.x - rx,
      y: c.y - ry,
      width: 2 * rx,
      height: 2 * ry,
    };
  }

  const fromP = { x: Math.cos(nfrom) * rx, y: Math.sin(nfrom) * ry };
  const toP = { x: Math.cos(nto) * rx, y: Math.sin(nto) * ry };

  const left = isRadianInside(nfrom, nto, Math.PI) ? -rx : Math.min(fromP.x, toP.x);
  const right = isRadianInside(nfrom, nto, 0) ? rx : Math.max(fromP.x, toP.x);
  const top = isRadianInside(nfrom, nto, -Math.PI / 2) ? -ry : Math.min(fromP.y, toP.y);
  const bottom = isRadianInside(nfrom, nto, Math.PI / 2) ? ry : Math.max(fromP.y, toP.y);

  return {
    x: left + c.x,
    y: top + c.y,
    width: right - left,
    height: bottom - top,
  };
}

export function isPointCloseToArc(
  { c, radius, to, from, counterclockwise }: ArcCurveParams,
  p: IVec2,
  threshold: number,
): boolean {
  const np = sub(p, c);
  if (Math.abs(getNorm(np) - radius) > threshold) return false;
  const [f, t] = counterclockwise ? [to, from] : [from, to];
  if (!isRadianInside(normalizeRadian(f), normalizeRadian(t), getRadian(np))) return false;
  return true;
}

/**
 * Suppose each argument is normalized. See: "normalizeRadian"
 * When nfrom === nto, returns true for any value.
 * Edge condition may be unstable.
 */
function isRadianInside(nfrom: number, nto: number, nr: number): boolean {
  if (nfrom === nto) return true;
  return (nfrom < nr && (nto < nfrom || nr <= nto)) || (nr < nfrom && nr <= nto && nto < nfrom);
}

export function isIdentityAffine(matrix: AffineMatrix): boolean {
  return matrix.every((v, i) => v === IDENTITY_AFFINE[i]);
}

export function lerpRect(from: IRectangle, to: IRectangle, t: number): IRectangle {
  const p0 = lerpPoint({ x: from.x, y: from.y }, { x: to.x, y: to.y }, t);
  const p2 = lerpPoint(
    { x: from.x + from.width, y: from.y + from.height },
    { x: to.x + to.width, y: to.y + to.height },
    t,
  );

  return { x: p0.x, y: p0.y, width: p2.x - p0.x, height: p2.y - p0.y };
}

export function getGlobalAffine(origin: IVec2, rotation: number, localAffine: AffineMatrix): AffineMatrix {
  if (rotation === 0) {
    return multiAffines([[1, 0, 0, 1, origin.x, origin.y], localAffine, [1, 0, 0, 1, -origin.x, -origin.y]]);
  }

  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);
  return multiAffines([
    [1, 0, 0, 1, origin.x, origin.y],
    [cos, sin, -sin, cos, 0, 0],
    localAffine,
    [cos, -sin, sin, cos, 0, 0],
    [1, 0, 0, 1, -origin.x, -origin.y],
  ]);
}

/**
 * Suppose all points are on the same line.
 * Returns segment respects the original points' order.
 */
export function pickLongSegment(a: IVec2, b: IVec2, c: IVec2): ISegment {
  const ab = sub(b, a);
  const cb = sub(b, c);
  if (getInner(ab, cb) < 0) {
    return [a, c];
  }

  const ac = sub(c, a);
  return getInner(ab, ac) < 0 ? [b, c] : [a, b];
}

export function getRoundedRectInnerBounds(rect: IRectangle, radiusX: number, radiusY: number): IRectangle {
  if (Math.abs(radiusX * radiusY) < MINVALUE) {
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  } else {
    const r = Math.atan(radiusY / radiusX);
    const rx = (1 - Math.cos(r)) * radiusX;
    const ry = (1 - Math.sin(r)) * radiusY;
    return {
      x: rect.x + rx,
      y: rect.y + ry,
      width: rect.width - rx * 2,
      height: rect.height - ry * 2,
    };
  }
}

export function rotateRectByAngle(target: IRectangle, origin: IVec2, by: 90 | -90 | 180): IRectangle {
  const r = (by * Math.PI) / 180;
  const c = rotate(getRectCenter(target), r, origin);
  const swapped = by !== 180;
  const w = swapped ? target.height : target.width;
  const h = swapped ? target.width : target.height;
  return { x: c.x - w / 2, y: c.y - h / 2, width: w, height: h };
}

export function getTriangleIncenter(a: IVec2, b: IVec2, c: IVec2): IVec2 {
  const da = getDistance(b, c);
  const db = getDistance(c, a);
  const dc = getDistance(a, b);
  const d = da + db + dc;
  if (Math.abs(d) < MINVALUE) return a;
  return { x: (a.x * da + b.x * db + c.x * dc) / d, y: (a.y * da + b.y * db + c.y * dc) / d };
}

export function getIntersectionBetweenCircles(ac: IVec2, ar: number, bc: IVec2, br: number): IVec2[] | undefined {
  const rotation = getRadian(bc, ac);
  const rotateFn = getRotateFn(rotation, ac);
  const nbc = sub(rotateFn(bc, true), ac);
  const d = Math.abs(nbc.x);

  if (d < MINVALUE) {
    return Math.abs(ar - br) < MINVALUE ? [{ x: ac.x + ar, y: ac.y }] : undefined;
  }
  if (d > ar + br) return;
  if (Math.abs(d - ar - br) < MINVALUE) {
    return [lerpPoint(ac, bc, ar / d)];
  }
  if (Math.abs(ar - (nbc.x + br)) < MINVALUE) {
    return [{ x: ac.x + ar, y: ac.y }];
  }
  if (Math.abs(-ar - (nbc.x - br)) < MINVALUE) {
    return [{ x: ac.x - ar, y: ac.y }];
  }

  const x = (d * d + ar * ar - br * br) / (2 * d);
  const rad = Math.acos(x / ar);
  return [
    { x, y: Math.sin(-rad) * ar },
    { x, y: Math.sin(rad) * ar },
  ].map((p) => rotateFn(add(p, ac)));
}

/**
 * Target rect keeps its global rotation.
 * => Only x and y can change via this transform.
 */
export function getRectRotateFn(radian: number, origin?: IVec2): (rect: IRectangle, reverse?: boolean) => IRectangle {
  if (radian === 0) return identityFn;

  const sin = Math.sin(radian);
  const cos = Math.cos(radian);
  return (rect: IRectangle, reverse = false) => {
    const c = getRectCenter(rect);
    const v = origin ? sub(c, origin) : c;
    const rotatedV = reverse
      ? { x: v.x * cos + v.y * sin, y: -v.x * sin + v.y * cos }
      : { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
    const rotatedC = origin ? add(rotatedV, origin) : rotatedV;
    return { x: rotatedC.x - rect.width / 2, y: rotatedC.y - rect.height / 2, width: rect.width, height: rect.height };
  };
}

/**
 * Suppose points in "src" are aligned in order on a line.
 */
export function mergeClosePoints(src: IVec2[], threshold: number): IVec2[] {
  const sections = splitPointsToCloseSections(
    src.map((p) => [p, 0] as const),
    threshold,
  );
  const ret: IVec2[] = [];
  sections.forEach((sec) => {
    ret.push(sec[0][0]);
    if (sec.length > 1) {
      ret.push(sec[sec.length - 1][0]);
    }
  });
  return ret;
}

/**
 * Suppose points in "src" are aligned in order on a line.
 */
export function splitPointsToCloseSections(src: [IVec2, size: number][], threshold: number): [IVec2, size: number][][] {
  const ret: [IVec2, number][][] = [[src[0]]];

  for (let i = 1; i < src.length; i++) {
    const [p, size] = src[i];
    const [prevP, prevSize] = src[i - 1];
    const d = threshold + (size + prevSize) / 2;

    if (getD2(sub(prevP, p)) > d * d) {
      ret.push([[p, size]]);
    } else {
      ret[ret.length - 1].push([p, size]);
    }
  }

  return ret;
}

/**
 * Returns expanded rect having integer values and accommodating the src.
 */
export function getIntRectFromFloatRect(src: IRectangle): IRectangle {
  const x = Math.floor(src.x);
  const y = Math.floor(src.y);
  const srcRight = src.x + src.width;
  const srcBottom = src.y + src.height;
  const right = Math.ceil(srcRight);
  const bottom = Math.ceil(srcBottom);
  const width = right - x;
  const height = bottom - y;
  return { x, y, width, height };
}

export function getRelativeRateWithinRect(rect: IRectangle, p: IVec2, shouldClamp = false): IVec2 {
  const rawRate = {
    x: rect.width === 0 ? 0 : (p.x - rect.x) / rect.width,
    y: rect.height === 0 ? 0 : (p.y - rect.y) / rect.height,
  };
  return shouldClamp ? { x: clamp(0, 1, rawRate.x), y: clamp(0, 1, rawRate.y) } : rawRate;
}

export function getRelativePointWithinRect(rect: IRectangle, rate: IVec2, shouldClamp = false): IVec2 {
  const adjustedRate = shouldClamp ? { x: clamp(0, 1, rate.x), y: clamp(0, 1, rate.y) } : rate;
  return { x: rect.x + rect.width * adjustedRate.x, y: rect.y + rect.height * adjustedRate.y };
}

export function getPointLerpSlope(lerpFn: (v: number) => IVec2, t: number, d = 0.0005): number {
  return getRadian(lerpFn(Math.min(1, t + d)), lerpFn(Math.max(0, t - d)));
}

export function getDiagonalLengthOfRect(rect: IRectangle): number {
  const dx = rect.width;
  const dy = rect.height;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getClosestLineToRectFeaturePoints(rect: IRectangle, lines: ISegment[]): ISegment | undefined {
  if (lines.length === 0) return;

  const featurePoints = getRectFeaturePoints(rect);
  return pickMinItem(
    lines.map((line) => {
      const d2 = pickMinItem(
        featurePoints.map((p) => {
          const pedal = getPedal(p, line);
          return getD2(sub(p, pedal));
        }),
        (v) => v,
      );
      return [line, d2 ?? Infinity] as const;
    }),
    (info) => info?.[1] ?? Infinity,
  )?.[0];
}

export function getEllipseSlopeAt(c: IVec2, rx: number, ry: number, p: IVec2): number {
  const centeredP = sub(p, c);
  return Math.atan2(centeredP.y * rx * rx, centeredP.x * ry * ry) - Math.PI / 2;
}

export function getBezierControlPaddingForBorderRadius(rx: number, ry: number): [rx: number, ry: number] {
  const rate = 0.44772; // Magic value to approximate border-radius via cubic-bezier
  return [rx * rate, ry * rate];
}

export function getViewportForRectWithinSize(
  targetRect: IRectangle,
  size: {
    width: number;
    height: number;
  },
  reduceScale: (val: number) => number = (v) => v,
): {
  p: IVec2;
  scale: number;
} {
  const rateW = size.width / targetRect.width;
  const rateH = size.height / targetRect.height;
  const scale = rateW < rateH ? reduceScale(1 / rateW) : reduceScale(1 / rateH);

  return {
    p: {
      x: targetRect.x + ((targetRect.width / scale - size.width) / 2) * scale,
      y: targetRect.y + ((targetRect.height / scale - size.height) / 2) * scale,
    },
    scale,
  };
}

export function getRectPathRotation(rectPath: IVec2[]): number {
  if (rectPath.length < 4) return 0;
  const [tl, tr, , bl] = rectPath;
  return isSame(tr, tl) ? getRadian(bl, tl) - Math.PI / 2 : getRadian(tr, tl);
}

const MINVALUE_SCALE = Math.pow(10, -Math.round(Math.log10(MINVALUE)));

/**
 * This one should be used only when the value no longer needs to be precise.
 * e.g. 9.9999999999 => 10
 */
export function roundFloatingError(val: number): number {
  const n = Math.round(val * MINVALUE_SCALE) / MINVALUE_SCALE;
  return Math.abs(val - n) < MINVALUE ? n : val;
}

export function doesRectAccommodateRect(outer: IRectangle, inner: IRectangle): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}
