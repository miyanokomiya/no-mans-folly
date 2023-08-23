import { IRectangle, IVec2 } from "okageo";
import { Shape } from "../models";
import { ShapeStruct } from "./core";
import { struct as rectangleStruct } from "./rectangle";

const SHAPE_STRUCTS: {
  [type: string]: ShapeStruct<any>;
} = {
  rectangle: rectangleStruct,
};

type GetStruct = (type: string) => ShapeStruct<any>;

export const getCommonStruct: GetStruct = (type: string) => {
  return SHAPE_STRUCTS[type];
};

export function createShape<T extends Shape>(getStruct: GetStruct, type: string, arg: Partial<T>): T {
  const struct = getStruct(type);
  return struct.create(arg);
}

export function renderShape(getStruct: GetStruct, ctx: CanvasRenderingContext2D, shape: Shape) {
  const struct = getStruct(shape.type);
  struct.render(ctx, shape);
}

export function getRect(getStruct: GetStruct, shape: Shape): IRectangle {
  const struct = getStruct(shape.type);
  return struct.getRect(shape);
}

export function isPointOn(getStruct: GetStruct, shape: Shape, p: IVec2): boolean {
  const struct = getStruct(shape.type);
  return struct.isPointOn(shape, p);
}
