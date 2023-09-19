import { IVec2, isSame } from "okageo";
import { Shape, Size } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";

export type TextShape = RectangleShape & {
  maxWidth: number;
  hAlign?: "left" | "center" | "right"; // "left" should be default
  vAlign?: "top" | "center" | "bottom"; // "top" should be default
  lineAttached?: number;
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
      vAlign: arg.vAlign,
      hAlign: arg.hAlign,
      lineAttached: arg.lineAttached,
    };
  },
  resize(shape, resizingAffine) {
    const ret: Partial<TextShape> = { ...recntagleStruct.resize(shape, resizingAffine) };
    if (ret.width) {
      ret.maxWidth = ret.width;
    }
    return ret;
  },
  canAttachSmartBranch: false,
};

export function isTextShape(shape: Shape): shape is TextShape {
  return shape.type === "text";
}

export function isLineLabelShape(shape: Shape): shape is TextShape {
  return isTextShape(shape) && shape.lineAttached !== undefined;
}

export function patchSize(shape: TextShape, size: Size): Partial<TextShape> | undefined {
  const ret: Partial<TextShape> = {};
  let x = shape.p.x;
  let y = shape.p.y;

  if (shape.width !== size.width) {
    const diff = size.width - shape.width;
    ret.width = size.width;
    switch (shape.hAlign) {
      case "center":
        x -= diff / 2;
        break;
      case "right":
        x -= diff;
        break;
    }
  }

  if (shape.height !== size.height) {
    const diff = size.height - shape.height;
    ret.height = size.height;
    switch (shape.vAlign) {
      case "center":
        y -= diff / 2;
        break;
      case "bottom":
        y -= diff;
        break;
    }
  }

  const p = { x, y };
  if (!isSame(p, shape.p)) {
    ret.p = p;
  }

  return Object.keys(ret).length > 0 ? ret : undefined;
}

export function patchPosition(shape: TextShape, p: IVec2): Partial<TextShape> | undefined {
  let x = p.x;
  switch (shape.hAlign) {
    case "center":
      x = p.x - shape.width / 2;
      break;
    case "right":
      x = p.x - shape.width;
      break;
  }

  let y = p.y;
  switch (shape.vAlign) {
    case "center":
      y = p.y - shape.height / 2;
      break;
    case "bottom":
      y = p.y - shape.height;
      break;
  }

  const ret = { x, y };
  return isSame(shape.p, ret) ? undefined : { p: ret };
}
