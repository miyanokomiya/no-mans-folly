import { IVec2, add, getUnit, isSame, isZero, multi, sub } from "okageo";
import { BoxAlign, Shape, Size } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";
import { getRotateFn } from "../utils/geometry";
import { mapReduce } from "../utils/commons";

export type TextShape = RectangleShape &
  BoxAlign & {
    maxWidth: number;
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
      height: arg.height ?? 14,
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
    if (shape.parentId && availableIdSet.has(shape.parentId)) {
      return undefined;
    }

    const ret: Partial<TextShape> = { lineAttached: undefined };
    if (shape.hAlign && shape.hAlign !== "left") ret.hAlign = undefined;
    if (shape.vAlign && shape.vAlign !== "top") ret.vAlign = undefined;

    return ret;
  },
  canAttachSmartBranch: false,
  resizeOnTextEdit: patchSize,
  ...mapReduce(textContainerModule, () => undefined),
};

export function isTextShape(shape: Shape): shape is TextShape {
  return shape.type === "text";
}

function patchSize(shape: TextShape, textBoxSize: Size): Partial<TextShape> | undefined {
  const ret: Partial<TextShape> = {};
  let x = shape.p.x;
  let y = shape.p.y;

  if (shape.width !== textBoxSize.width) {
    const diff = textBoxSize.width - shape.width;
    ret.width = textBoxSize.width;
    switch (shape.hAlign) {
      case "center":
        x -= diff / 2;
        break;
      case "right":
        x -= diff;
        break;
    }
  }

  if (shape.height !== textBoxSize.height) {
    const diff = textBoxSize.height - shape.height;
    ret.height = textBoxSize.height;
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

export function patchPosition(shape: TextShape, p: IVec2, margin = 0): Partial<TextShape> | undefined {
  const rotatedBase = getLineLabelAnchorPoint(shape, margin);
  const diff = sub(shape.p, rotatedBase);
  const ret = add(p, diff);
  return isSame(shape.p, ret) ? undefined : { p: ret };
}

/**
 * "margin" gets the anchor away from its original position by the distance.
 */
export function getLineLabelAnchorPoint(label: TextShape, margin = 0): IVec2 {
  const center = { x: label.width / 2, y: label.height / 2 };
  const rotateFn = getRotateFn(label.rotation, center);

  let x: number;
  let ux: number;
  switch (label.hAlign) {
    case "center":
      x = label.width / 2;
      ux = 0;
      break;
    case "right":
      x = label.width;
      ux = 1;
      break;
    default:
      x = 0;
      ux = -1;
      break;
  }

  let y: number;
  let uy: number;
  switch (label.vAlign) {
    case "center":
      y = label.height / 2;
      uy = 0;
      break;
    case "bottom":
      y = label.height;
      uy = 1;
      break;
    default:
      y = 0;
      uy = -1;
      break;
  }

  const marginBaseV = { x: ux, y: uy };
  const marginV = !isZero(marginBaseV) ? multi(getUnit(marginBaseV), margin) : { x: 0, y: 0 };

  return add(rotateFn(add({ x, y }, marginV)), label.p);
}
