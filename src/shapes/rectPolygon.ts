import { AffineMatrix, IRectangle, IVec2, MINVALUE, getDistance, getRectCenter, multiAffines } from "okageo";
import { Shape } from "../models";
import { getClosestOutlineOnRectangle, getRotateFn } from "../utils/geometry";

export type RectPolygonShape = Shape & {
  width: number;
  height: number;
};

export function getRectShapeRect(shape: RectPolygonShape): IRectangle {
  return { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
}

export function getRectShapeCenter(shape: RectPolygonShape): IVec2 {
  return { x: shape.p.x + shape.width / 2, y: shape.p.y + shape.height / 2 };
}

export function getShapeTransform(shape: RectPolygonShape): AffineMatrix {
  const rect = getRectShapeRect(shape);
  const center = getRectCenter(rect);
  const sin = Math.sin(shape.rotation);
  const cos = Math.cos(shape.rotation);

  return multiAffines([
    [1, 0, 0, 1, center.x, center.y],
    [cos, sin, -sin, cos, 0, 0],
    [1, 0, 0, 1, rect.x - center.x, rect.y - center.y],
  ]);
}

export function getShapeDetransform(shape: RectPolygonShape): AffineMatrix {
  const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const center = getRectCenter(rect);
  const sin = Math.sin(shape.rotation);
  const cos = Math.cos(shape.rotation);

  return multiAffines([
    [1, 0, 0, 1, -(rect.x - center.x), -(rect.y - center.y)],
    [cos, -sin, sin, cos, 0, 0],
    [1, 0, 0, 1, -center.x, -center.y],
  ]);
}

export function isSizeChanged(shape: RectPolygonShape, { width, height }: Partial<RectPolygonShape>): boolean {
  if (width !== undefined && Math.abs(width - shape.width) > MINVALUE) return true;
  if (height !== undefined && Math.abs(height - shape.height) > MINVALUE) return true;
  return false;
}

function getRectMarkers(rect: IRectangle, center: IVec2): IVec2[] {
  return [
    { x: rect.x, y: rect.y },
    { x: center.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: center.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: center.x, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x, y: center.y },
  ];
}

export function getClosestOutlineForRect(
  rect: IRectangle,
  rotation: number,
  p: IVec2,
  threshold: number,
  thresholdForMarker = threshold,
) {
  const center = getRectCenter(rect);
  const rotateFn = getRotateFn(rotation, center);
  const rotatedP = rotateFn(p, true);

  {
    const markers = getRectMarkers(rect, center);
    const rotatedClosest = markers.find((m) => getDistance(m, rotatedP) <= thresholdForMarker);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }

  {
    const rotatedClosest = getClosestOutlineOnRectangle(rect, rotatedP, threshold);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }
}
