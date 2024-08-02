import { Shape } from "../../models";
import { createBoxPadding } from "../../utils/boxPadding";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { struct as recntagleStruct } from "../rectangle";
import { isPointOnGroup } from "../group";
import { TreeShapeBase, resizeTreeShape, resizeTreeShapeOnTextEdit } from "./core";
import { applyLocalSpace } from "../../utils/renderer";
import { getRotatedRectAffine } from "../../utils/geometry";
import { renderTransform } from "../../utils/svgElements";
import { CHILD_MARGIN, SIBLING_MARGIN } from "../../utils/layouts/tree";

const MIN_WIDTH = 120;
const MIN_HEIGHT = 60;

export type TreeRootShape = TreeShapeBase & {
  siblingMargin?: number;
  childMargin?: number;
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
      width: arg.width ?? MIN_WIDTH,
      height: arg.height ?? MIN_HEIGHT,
      textPadding: arg.textPadding ?? createBoxPadding([6, 6, 6, 6]),
      maxWidth: arg.maxWidth ?? 300,
      siblingMargin: arg.siblingMargin,
      childMargin: arg.childMargin,
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
    return resizeTreeShape(shape, resizingAffine, MIN_WIDTH, MIN_HEIGHT);
  },
  resizeOnTextEdit(shape, textBoxSize) {
    return resizeTreeShapeOnTextEdit(shape, textBoxSize, MIN_WIDTH, MIN_HEIGHT);
  },
  isPointOn(shape, p, shapeContext) {
    const selfResult = recntagleStruct.isPointOn(shape, p, shapeContext);
    return selfResult || (!!shapeContext && isPointOnGroup(shape, p, shapeContext));
  },
  canAttachSmartBranch: false,
  transparentSelection: true,
};

export function isTreeRootShape(shape?: Shape): shape is TreeRootShape {
  return shape?.type === "tree_root";
}

export function getTreeChildMargin(shape: TreeRootShape): number {
  return shape.childMargin ?? CHILD_MARGIN;
}

export function getTreeSiblingMargin(shape: TreeRootShape): number {
  return shape.siblingMargin ?? SIBLING_MARGIN;
}
