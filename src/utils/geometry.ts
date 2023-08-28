import {
  IRectangle,
  IVec2,
  getDistance,
  getOuterRectangle,
  getPedal,
  getRadian,
  getRectCenter,
  isOnSeg,
  isParallel,
  multi,
  rotate,
  sub,
  vec,
} from "okageo";

export type ISegment = [IVec2, IVec2];

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
  threshold: number
): IVec2 | undefined {
  const np = sub(p, c);
  const r = getRadian({ x: np.x / rx, y: np.y / ry });
  const x = c.x + Math.cos(r) * rx;
  const y = c.y + Math.sin(r) * ry;
  const ep = { x, y };
  return getDistance(ep, p) <= threshold ? ep : undefined;
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

export function getCrossLineAndLine(line0: IVec2[], line1: IVec2[]): IVec2 | undefined {
  if (isParallel(sub(line0[0], line0[1]), sub(line1[0], line1[1]))) return;

  const s1 =
    ((line1[1].x - line1[0].x) * (line0[0].y - line1[0].y) - (line1[1].y - line1[0].y) * (line0[0].x - line1[0].x)) / 2;
  const s2 =
    ((line1[1].x - line1[0].x) * (line1[0].y - line0[1].y) - (line1[1].y - line1[0].y) * (line1[0].x - line0[1].x)) / 2;
  const rate = s1 / (s1 + s2);
  return vec(line0[0].x + (line0[1].x - line0[0].x) * rate, line0[0].y + (line0[1].y - line0[0].y) * rate);
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
