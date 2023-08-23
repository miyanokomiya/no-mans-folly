import { IRectangle, IVec2 } from "okageo";

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
