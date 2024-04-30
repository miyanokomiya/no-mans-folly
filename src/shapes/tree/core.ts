import { AffineMatrix } from "okageo";
import { BoxAlign, Shape, Size } from "../../models";
import { RectangleShape } from "../rectangle";
import { getPaddingRect } from "../../utils/boxPadding";
import { struct as recntagleStruct } from "../rectangle";

export type TreeShapeBase = RectangleShape &
  BoxAlign & {
    maxWidth: number;
  };

export function isTreeShapeBase(shape: Shape): shape is TreeShapeBase {
  return shape.type === "tree_root" || shape.type === "tree_node";
}

export function resizeTreeShape<T extends TreeShapeBase>(
  shape: T,
  resizingAffine: AffineMatrix,
  minWidth: number,
  minHeight: number,
): Partial<T> {
  const ret = { ...recntagleStruct.resize(shape, resizingAffine) } as Partial<T>;
  if (ret.width !== undefined) {
    ret.width = Math.max(ret.width, minWidth);
    ret.maxWidth = ret.width;
  }
  if (ret.height !== undefined) {
    ret.height = Math.max(ret.height, minHeight);
  }
  return ret;
}

export function resizeTreeShapeOnTextEdit<T extends TreeShapeBase>(
  shape: T,
  textBoxSize: Size,
  minWidth: number,
  minHeight: number,
): Partial<T> | undefined {
  const prect = shape.textPadding
    ? getPaddingRect(shape.textPadding, { x: 0, y: 0, width: shape.width, height: shape.height })
    : undefined;
  const wDiff = prect ? shape.width - prect.width : 0;
  const hDiff = prect ? shape.height - prect.height : 0;

  let changed = false;
  const ret: Partial<T> = {};

  const nextWidth = textBoxSize.width + wDiff;
  if (shape.width !== nextWidth) {
    ret.width = Math.max(nextWidth, minWidth);
    changed = true;
  }

  const nextHeight = textBoxSize.height + hDiff;
  if (shape.height !== nextHeight) {
    ret.height = Math.max(nextHeight, minHeight);
    changed = true;
  }

  return changed ? ret : undefined;
}
