import { Shape } from "../../models";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { struct as recntagleStruct } from "../rectangle";
import { struct as groupStruct } from "../group";
import { TreeShapeBase } from "./core";
import { applyLocalSpace } from "../../utils/renderer";
import { getRotatedRectAffine } from "../../utils/geometry";
import { renderTransform } from "../../utils/svgElements";

const MIN_WIDTH = 120;
const MIN_HEIGHT = 60;

export type TreeRootShape = TreeShapeBase;

export const struct: ShapeStruct<TreeRootShape> = {
  ...recntagleStruct,
  label: "TreeRoot",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "tree_root",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? MIN_WIDTH,
      height: arg.height ?? MIN_HEIGHT,
      textPadding: arg.textPadding ?? createBoxPadding([6, 6, 6, 6]),
      maxWidth: arg.maxWidth ?? 300,
    };
  },
  render(ctx, shape) {
    if (shape.fill.disabled && shape.stroke.disabled) return;

    applyLocalSpace(
      ctx,
      { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height },
      shape.rotation,
      () => {
        ctx.beginPath();
        ctx.roundRect(0, 0, shape.width, shape.height, 6);

        if (!shape.fill.disabled) {
          applyFillStyle(ctx, shape.fill);
          ctx.fill();
        }
        if (!shape.stroke.disabled) {
          applyStrokeStyle(ctx, shape.stroke);
          ctx.stroke();
        }
      },
    );
  },
  createSVGElementInfo(shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const affine = getRotatedRectAffine(rect, shape.rotation);

    return {
      tag: "g",
      attributes: {
        transform: renderTransform(affine),
        ...renderFillSVGAttributes(shape.fill),
        ...renderStrokeSVGAttributes(shape.stroke),
      },
      children: [
        {
          tag: "rect",
          attributes: {
            rx: 6,
            ry: 6,
            width: shape.width,
            height: shape.height,
          },
        },
      ],
    };
  },
  resize(shape, resizingAffine) {
    const ret: Partial<TreeRootShape> = { ...recntagleStruct.resize(shape, resizingAffine) };
    if (ret.width !== undefined) {
      ret.width = Math.max(ret.width, MIN_WIDTH);
      ret.maxWidth = ret.width;
    }
    if (ret.height !== undefined) {
      ret.height = Math.max(ret.height, MIN_HEIGHT);
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
      ret.width = Math.max(nextWidth, MIN_WIDTH);
      changed = true;
    }

    const nextHeight = textBoxSize.height + hDiff;
    if (shape.height !== nextHeight) {
      ret.height = Math.max(nextHeight, MIN_HEIGHT);
      changed = true;
    }

    return changed ? ret : undefined;
  },
  isPointOn(shape, p, shapeContext) {
    const selfResult = recntagleStruct.isPointOn(shape, p, shapeContext);
    return selfResult || groupStruct.isPointOn(shape, p, shapeContext);
  },
  transparentSelection: true,
};

export function isTreeRootShape(shape?: Shape): shape is TreeRootShape {
  return shape?.type === "tree_root";
}
