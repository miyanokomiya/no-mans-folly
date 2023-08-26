import { AffineMatrix, IRectangle, IVec2 } from "okageo";
import { Shape } from "../models";
import { ShapeStruct } from "./core";
import { struct as rectangleStruct } from "./rectangle";
import { struct as ellipseStruct } from "./ellipse";
import { getRectLines } from "../utils/geometry";

const SHAPE_STRUCTS: {
  [type: string]: ShapeStruct<any>;
} = {
  rectangle: rectangleStruct,
  ellipse: ellipseStruct,
};

export type GetShapeStruct = (type: string) => ShapeStruct<any>;

export const getCommonStruct: GetShapeStruct = (type: string) => {
  return SHAPE_STRUCTS[type];
};

export function createShape<T extends Shape>(getStruct: GetShapeStruct, type: string, arg: Partial<T>): T {
  const struct = getStruct(type);
  return struct.create(arg);
}

export function renderShape(getStruct: GetShapeStruct, ctx: CanvasRenderingContext2D, shape: Shape) {
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

export function getSnappingLines(getStruct: GetShapeStruct, shape: Shape): [IVec2, IVec2][] {
  const struct = getStruct(shape.type);
  if (struct.getSnappingLines) return struct.getSnappingLines(shape);
  return getRectLines(struct.getWrapperRect(shape));
}
