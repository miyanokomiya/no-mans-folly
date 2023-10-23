import {
  IRectangle,
  IVec2,
  MINVALUE,
  add,
  clamp,
  getCenter,
  getCrossSegAndLine,
  getDistance,
  getOuterRectangle,
  getPedal,
  getRadian,
  getRectCenter,
  interpolateVector,
  isOnSeg,
  isParallel,
  multi,
  multiAffines,
  rotate,
  solveEquationOrder2,
  sub,
  vec,
} from "okageo";

export type ISegment = [IVec2, IVec2];

export type RotatedRectPath = [path: IVec2[], rotation: number];

export const TAU = Math.PI * 2;

export function getD2(v: IVec2): number {
  return v.x * v.x + v.y * v.y;
}

export function getRotateFn(radian: number, origin?: IVec2): (p: IVec2, reverse?: boolean) => IVec2 {
  if (radian === 0) return (p) => p;

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
  if (d === undefined || threshold < Math.sqrt(d)) return;

  return candidate;
}

export function getIntersectedOutlinesOnPolygon(polygon: IVec2[], from: IVec2, to: IVec2): IVec2[] | undefined {
  const seg: ISegment = [from, to];
  const ret: IVec2[] = [];

  polygon.forEach((p, i) => {
    const s = getCrossSegAndSeg([p, polygon[(i + 1) % polygon.length]], seg);
    if (!s) return;
    ret.push(s);
  });

  return ret.length === 0 ? undefined : sortPointFrom(from, ret);
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

// When the pedal point isn't on the segment, this always returns false.
export function isPointCloseToSegment(seg: IVec2[], p: IVec2, threshold: number): boolean {
  const pedal = getPedal(p, seg);
  const d = getDistance(p, pedal);
  if (d > threshold) return false;

  return isOnSeg(pedal, seg);
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

export function snapScale(scale: IVec2, step = 0.1): IVec2 {
  return {
    x: snapNumber(scale.x, step),
    y: snapNumber(scale.y, step),
  };
}

export function snapNumber(value: number, step = 1): number {
  return Math.round(value / step) * step;
}

export function snapNumberCeil(value: number, step = 1): number {
  return Math.ceil(value / step) * step;
}

export function sortNumFn(a: number, b: number): number {
  return a - b;
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
  const s = getCrossSegAndLine(seg0, seg1);
  if (!s) return;
  if (!isOnSeg(s, seg1)) return;
  return s;
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

export function getLocationRateOnRectPath(rectPath: IVec2[], rotation: number, p: IVec2): IVec2 {
  const center = getCenter(rectPath[0], rectPath[2]);
  const rotatedP = rotate(p, -rotation, center);
  const rotatedPath = rectPath.map((v) => rotate(v, -rotation, center));
  return {
    x: (rotatedP.x - rotatedPath[0].x) / (rotatedPath[1].x - rotatedPath[0].x),
    y: (rotatedP.y - rotatedPath[0].y) / (rotatedPath[3].y - rotatedPath[0].y),
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

/**
 * "rectPath" must be rectangluar
 */
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
