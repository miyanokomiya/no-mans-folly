import { Shape, Size } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";

export type TextShape = RectangleShape & {
  maxWidth: number;
};

export const struct: ShapeStruct<TextShape> = {
  ...recntagleStruct,
  label: "Text",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "text",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle({ disabled: true }),
      width: arg.width ?? 10,
      height: arg.height ?? 18,
      maxWidth: arg.maxWidth ?? 600,
    };
  },
  resize(shape, resizingAffine) {
    const ret: Partial<TextShape> = { ...recntagleStruct.resize(shape, resizingAffine) };
    if (ret.width) {
      ret.maxWidth = ret.width;
    }
    return ret;
  },
};

export function isTextShape(shape: Shape): shape is TextShape {
  return shape.type === "text";
}

export function patchSize(shape: TextShape, size: Size): Partial<TextShape> | undefined {
  const ret: Partial<TextShape> = {};
  if (shape.width !== size.width) {
    ret.width = size.width;
  }
  if (shape.height !== size.height) {
    ret.height = size.height;
  }
  return Object.keys(ret).length > 0 ? ret : undefined;
}
