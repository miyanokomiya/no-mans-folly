import { IVec2, applyAffine, isSame, sub } from "okageo";
import { CommonStyle, Shape } from "../../models";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../../utils/fillStyle";
import { TAU, expandRect, getD2, getRectPoints, getRotatedRectAffine } from "../../utils/geometry";
import {
  applyStrokeStyle,
  createStrokeStyle,
  getStrokeWidth,
  renderStrokeSVGAttributes,
} from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { renderTransform } from "../../utils/svgElements";
import { covertEllipseToBezier } from "../../utils/path";
import { getCommonStyle, updateCommonStyle } from "../core";

/**
 * VnNode shape is supposed to be a dot.
 * "r" is the radius of the dot and should be used only for visualization purposes.
 */
export type VnNodeShape = Shape & CommonStyle & { r: number };

export const struct: ShapeStruct<VnNodeShape> = {
  label: "VNNode",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "vn_node",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      r: arg.r ?? 4,
    };
  },
  render(ctx, shape) {
    if (shape.fill.disabled && shape.stroke.disabled) return;

    ctx.beginPath();
    ctx.arc(shape.p.x, shape.p.y, shape.r, 0, TAU);
    if (!shape.fill.disabled) {
      applyFillStyle(ctx, shape.fill);
      ctx.fill();
    }
    if (!shape.stroke.disabled) {
      applyStrokeStyle(ctx, shape.stroke);
      ctx.stroke();
    }
  },
  createSVGElementInfo(shape) {
    if (shape.fill.disabled && shape.stroke.disabled) return;

    const rect = getArcBounds(shape);
    const affine = getRotatedRectAffine(rect, shape.rotation);

    return {
      tag: "ellipse",
      attributes: {
        cx: 0,
        cy: 0,
        rx: shape.r,
        ry: shape.r,
        transform: renderTransform(affine),
        ...renderFillSVGAttributes(shape.fill),
        ...renderStrokeSVGAttributes(shape.stroke),
      },
    };
  },
  getWrapperRect(shape, _, includeBounds) {
    const rect = getArcBounds(shape, includeBounds);
    if (!includeBounds) return rect;
    return expandRect(rect, getStrokeWidth(shape.stroke) / 2);
  },
  getLocalRectPolygon,
  isPointOn(shape, p) {
    return getD2(sub(shape.p, p)) <= shape.r ** 2;
  },
  resize(shape, resizingAffine) {
    const p = applyAffine(resizingAffine, shape.p);
    const ret: Partial<VnNodeShape> = {};
    if (!isSame(p, shape.p)) ret.p = p;
    return ret;
  },
  getSnappingLines(shape) {
    return {
      h: [
        [
          { x: shape.p.x - shape.r, y: shape.p.y },
          { x: shape.p.x + shape.r, y: shape.p.y },
        ],
      ],
      v: [
        [
          { x: shape.p.x, y: shape.p.y - shape.r },
          { x: shape.p.x, y: shape.p.y + shape.r },
        ],
      ],
    };
  },
  getHighlightPaths(shape) {
    return [covertEllipseToBezier(shape.p, shape.r, shape.r, shape.rotation, -Math.PI, Math.PI)];
  },
  getCommonStyle,
  updateCommonStyle,
  noRotation: true,
};

function getArcBounds(shape: VnNodeShape, includeBounds = false) {
  return includeBounds
    ? {
        x: shape.p.x - shape.r,
        y: shape.p.y - shape.r,
        width: shape.r * 2,
        height: shape.r * 2,
      }
    : {
        x: shape.p.x,
        y: shape.p.y,
        width: 0,
        height: 0,
      };
}

function getLocalRectPolygon(shape: VnNodeShape): IVec2[] {
  return getRectPoints(getArcBounds(shape));
}

export function isVNNodeShape(shape: Shape): shape is VnNodeShape {
  return shape.type === "vn_node";
}
