import { IVec2, add, applyAffine, getCenter, isSame, sub } from "okageo";
import { CommonStyle, Shape } from "../../models";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../../utils/fillStyle";
import {
  TAU,
  expandRect,
  getD2,
  getRectPoints,
  getRotatedRectAffine,
  getRotatedWrapperRect,
} from "../../utils/geometry";
import {
  applyStrokeStyle,
  createStrokeStyle,
  getStrokeWidth,
  renderStrokeSVGAttributes,
} from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { renderTransform } from "../../utils/svgElements";
import { covertEllipseToBezier } from "../../utils/path";

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
    ctx.arc(shape.p.x + shape.r, shape.p.y + shape.r, shape.r, 0, TAU);
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
        cx: shape.r,
        cy: shape.r,
        rx: shape.r,
        ry: shape.r,
        transform: renderTransform(affine),
        ...renderFillSVGAttributes(shape.fill),
        ...renderStrokeSVGAttributes(shape.stroke),
      },
    };
  },
  getWrapperRect(shape, _, includeBounds) {
    let rect = getArcBounds(shape);
    if (includeBounds) {
      rect = expandRect(rect, getStrokeWidth(shape.stroke) / 2);
    }
    return getRotatedWrapperRect(rect, shape.rotation);
  },
  getLocalRectPolygon,
  isPointOn(shape, p) {
    const c = add(shape.p, { x: shape.r, y: shape.r });
    return getD2(sub(c, p)) <= shape.r ** 2;
  },
  resize(shape, resizingAffine) {
    const rectPolygon = getLocalRectPolygon(shape).map((p) => applyAffine(resizingAffine, p));
    const c = getCenter(rectPolygon[0], rectPolygon[2]);
    const p = sub(c, { x: shape.r, y: shape.r });

    const ret: Partial<VnNodeShape> = {};
    if (!isSame(p, shape.p)) ret.p = p;

    return ret;
  },
  getSnappingLines(shape) {
    return {
      h: [
        [
          { x: shape.p.x, y: shape.p.y + shape.r },
          { x: shape.p.x + 2 * shape.r, y: shape.p.y + shape.r },
        ],
      ],
      v: [
        [
          { x: shape.p.x + shape.r, y: shape.p.y },
          { x: shape.p.x + shape.r, y: shape.p.y + 2 * shape.r },
        ],
      ],
    };
  },
  getHighlightPaths(shape) {
    const center = add(shape.p, { x: shape.r, y: shape.r });
    return [covertEllipseToBezier(center, shape.r, shape.r, shape.rotation, -Math.PI, Math.PI)];
  },
  noRotation: true,
};

function getArcBounds(shape: VnNodeShape) {
  return {
    x: shape.p.x + shape.r,
    y: shape.p.y + shape.r,
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
