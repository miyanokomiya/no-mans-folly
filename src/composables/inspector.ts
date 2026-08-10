import { AffineMatrix, getCenter, IVec2, multiAffines } from "okageo";
import { Shape } from "../models";
import { ShapeComposite } from "./shapeComposite";
import { divideSafely, getRectWithRotationFromRectPolygon } from "../utils/geometry";

export function getMoveToAffine(subShapeComposite: ShapeComposite, shape: Shape, to: IVec2): AffineMatrix {
  const [origin] = getRectWithRotationFromRectPolygon(subShapeComposite.getLocalRectPolygon(shape));
  return [1, 0, 0, 1, to.x - origin.x, to.y - origin.y];
}

export function getScaleToAffine(subShapeComposite: ShapeComposite, shape: Shape, to: IVec2): AffineMatrix {
  const polygon = subShapeComposite.getLocalRectPolygon(shape);
  const [rect] = getRectWithRotationFromRectPolygon(polygon);
  const origin = polygon[0];
  const sin = Math.sin(shape.rotation);
  const cos = Math.cos(shape.rotation);

  return multiAffines([
    [1, 0, 0, 1, origin.x, origin.y],
    [cos, sin, -sin, cos, 0, 0],
    [divideSafely(to.x, rect.width, 1), 0, 0, divideSafely(to.y, rect.height, 1), 0, 0],
    [cos, -sin, sin, cos, 0, 0],
    [1, 0, 0, 1, -origin.x, -origin.y],
  ]);
}

export function getRotateToAffine(subShapeComposite: ShapeComposite, shape: Shape, to: number): AffineMatrix {
  const polygon = subShapeComposite.getLocalRectPolygon(shape);
  const origin = getCenter(polygon[0], polygon[2]);
  const sin = Math.sin(to - shape.rotation);
  const cos = Math.cos(to - shape.rotation);

  return multiAffines([
    [1, 0, 0, 1, origin.x, origin.y],
    [cos, sin, -sin, cos, 0, 0],
    [1, 0, 0, 1, -origin.x, -origin.y],
  ]);
}
