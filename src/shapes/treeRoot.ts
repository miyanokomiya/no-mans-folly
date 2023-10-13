import { BoxAlign, Shape } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";

export type TreeRootShape = RectangleShape &
  BoxAlign & {
    maxWidth: number;
  };

export const struct: ShapeStruct<TreeRootShape> = {
  ...recntagleStruct,
  label: "TreeRoot",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "tree_root",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 30,
      maxWidth: arg.maxWidth ?? 300,
    };
  },
  resize(shape, resizingAffine) {
    const ret: Partial<TreeRootShape> = { ...recntagleStruct.resize(shape, resizingAffine) };
    if (ret.width) {
      ret.maxWidth = ret.width;
    }
    return ret;
  },
  canAttachSmartBranch: false,
  resizeOnTextEdit(shape, size) {
    let changed = false;
    const ret: Partial<TreeRootShape> = {};
    if (shape.width !== size.width) {
      ret.width = size.width;
      changed = true;
    }
    if (shape.height !== size.height) {
      ret.height = size.height;
      changed = true;
    }
    return changed ? ret : undefined;
  },
};

export function isTreeRootShape(shape: Shape): shape is TreeRootShape {
  return shape.type === "tree_root";
}
