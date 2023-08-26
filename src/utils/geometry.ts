import { IRectangle, IVec2, getDistance, getOuterRectangle, getPedal, getRectCenter, isOnSeg, rotate } from "okageo";

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

export function isPointOnEllipse(c: IVec2, rx: number, ry: number, p: IVec2): boolean {
  const dx = c.x - p.x;
  const dy = c.y - p.y;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
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
