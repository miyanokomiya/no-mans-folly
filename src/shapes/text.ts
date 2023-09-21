import { IVec2, add, getCenter, isSame, sub } from "okageo";
import { Shape, Size } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";
import { getRotateFn } from "../utils/geometry";

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
  refreshRelation(shape, availableIdSet) {
    if (!shape.parentId || availableIdSet.has(shape.parentId)) return;

    const ret: Partial<TextShape> = { lineAttached: undefined };
    if (shape.hAlign && shape.hAlign !== "left") ret.hAlign = undefined;
    if (shape.vAlign && shape.vAlign !== "top") ret.vAlign = undefined;

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
  const rectPolygon = struct.getLocalRectPolygon(shape);
  const center = getCenter(rectPolygon[0], rectPolygon[2]);
  const rotateFn = getRotateFn(shape.rotation, center);

  let x = shape.p.x;
  switch (shape.hAlign) {
    case "center":
      x += shape.width / 2;
      break;
    case "right":
      x += shape.width;
      break;
  }

  let y = shape.p.y;
  switch (shape.vAlign) {
    case "center":
      y += shape.height / 2;
      break;
    case "bottom":
      y += shape.height;
      break;
  }

  const rotatedBase = rotateFn({ x, y });
  const diff = sub(shape.p, rotatedBase);
  const ret = add(p, diff);
  return isSame(shape.p, ret) ? undefined : { p: ret };
}
