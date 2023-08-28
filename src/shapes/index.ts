import { AffineMatrix, IRectangle, IVec2 } from "okageo";
import { Shape } from "../models";
import { ShapeSnappingLines, ShapeStruct } from "./core";
import { struct as rectangleStruct } from "./rectangle";
import { struct as ellipseStruct } from "./ellipse";
import { struct as lineStruct } from "./line";
import { getLocationRateOnRectPath, getRectCenterLines, getRectLines } from "../utils/geometry";

const SHAPE_STRUCTS: {
  [type: string]: ShapeStruct<any>;
} = {
  rectangle: rectangleStruct,
  ellipse: ellipseStruct,
  line: lineStruct,
};

export type GetShapeStruct = (type: string) => ShapeStruct<any>;

export const getCommonStruct: GetShapeStruct = (type: string) => {
  return SHAPE_STRUCTS[type];
};

export function createShape<T extends Shape>(getStruct: GetShapeStruct, type: string, arg: Partial<T>): T {
  const struct = getStruct(type);
  return struct.create(arg);
}

export function renderShape<T extends Shape>(getStruct: GetShapeStruct, ctx: CanvasRenderingContext2D, shape: T) {
  const struct = getStruct(shape.type);
  struct.render(ctx, shape);
}

export function getWrapperRect(getStruct: GetShapeStruct, shape: Shape): IRectangle {
  const struct = getStruct(shape.type);
  return struct.getWrapperRect(shape);
}

export function getLocalRectPolygon(getStruct: GetShapeStruct, shape: Shape): IVec2[] {
  const struct = getStruct(shape.type);
  return struct.getLocalRectPolygon(shape);
}

export function isPointOn(getStruct: GetShapeStruct, shape: Shape, p: IVec2): boolean {
  const struct = getStruct(shape.type);
  return struct.isPointOn(shape, p);
}

export function resizeShape(getStruct: GetShapeStruct, shape: Shape, resizingAffine: AffineMatrix): Partial<Shape> {
  const struct = getStruct(shape.type);
  return struct.resize(shape, resizingAffine);
}

export function getSnappingLines(getStruct: GetShapeStruct, shape: Shape): ShapeSnappingLines {
  const struct = getStruct(shape.type);
  if (struct.getSnappingLines) return struct.getSnappingLines(shape);

  const rect = struct.getWrapperRect(shape);
  const [t, r, b, l] = getRectLines(rect);
  const [cv, ch] = getRectCenterLines(rect);
  return {
    v: [l, cv, r],
    h: [t, ch, b],
  };
}

export function getClosestOutline(
  getStruct: GetShapeStruct,
  shape: Shape,
  p: IVec2,
  threshold: number
): IVec2 | undefined {
  const struct = getStruct(shape.type);
  if (struct.getClosestOutline) return struct.getClosestOutline(shape, p, threshold);
}

export function getLocationRateOnShape(getStruct: GetShapeStruct, shape: Shape, p: IVec2) {
  return getLocationRateOnRectPath(getLocalRectPolygon(getStruct, shape), shape.rotation, p);
}
