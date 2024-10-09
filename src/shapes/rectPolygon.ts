import { AffineMatrix, IRectangle, IVec2, MINVALUE, getRectCenter, multiAffines } from "okageo";
import { Shape } from "../models";

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
