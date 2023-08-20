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

export function createShape(getStruct: GetStruct, type: string, arg: Partial<Shape>): Shape {
  const struct = getStruct(type);
  return struct.create(arg);
}

export function renderShape(getStruct: GetStruct, ctx: CanvasRenderingContext2D, shape: Shape) {
  const struct = getStruct(shape.type);
  struct.render(ctx, shape);
}
