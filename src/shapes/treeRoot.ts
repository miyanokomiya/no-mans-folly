import { BoxAlign, Shape } from "../models";
import { createBoxPadding, getPaddingRect } from "../utils/boxPadding";
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
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
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
  resizeOnTextEdit(shape, textBoxSize) {
    const prect = shape.textPadding
      ? getPaddingRect(shape.textPadding, { x: 0, y: 0, width: shape.width, height: shape.height })
      : undefined;
    const wDiff = prect ? shape.width - prect.width : 0;
    const hDiff = prect ? shape.height - prect.height : 0;

    let changed = false;
    const ret: Partial<TreeRootShape> = {};

    const nextWidth = textBoxSize.width + wDiff;
    if (shape.width !== nextWidth) {
      ret.width = nextWidth;
      changed = true;
    }

    const nextHeight = textBoxSize.height + hDiff;
    if (shape.height !== nextHeight) {
      ret.height = nextHeight;
      changed = true;
    }

    return changed ? ret : undefined;
  },
};

export function isTreeRootShape(shape: Shape): shape is TreeRootShape {
  return shape.type === "tree_root";
}
