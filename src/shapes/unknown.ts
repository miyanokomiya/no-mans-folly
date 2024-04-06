import { applyAffine, isSame, sub } from "okageo";
import { Shape } from "../models";
import { applyFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import { getRectPoints, getD2, TAU, expandRect } from "../utils/geometry";
import { ShapeStruct, createBaseShape } from "./core";
import { COLORS } from "../utils/color";
import { applyStrokeStyle, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { renderTransform } from "../utils/svgElements";

const radius = 25;
const lineWidth = 3;

export const struct: ShapeStruct<Shape> = {
  label: "Unknown",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "unknown",
    };
  },
  render(ctx, shape) {
    applyStrokeStyle(ctx, { color: COLORS.BLACK, width: lineWidth });
    applyFillStyle(ctx, { color: COLORS.GRAY_1 });
    ctx.beginPath();
    ctx.arc(shape.p.x, shape.p.y, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    const size = radius * 0.5;
    ctx.moveTo(shape.p.x - size, shape.p.y - size);
    ctx.lineTo(shape.p.x + size, shape.p.y + size);
    ctx.moveTo(shape.p.x - size, shape.p.y + size);
    ctx.lineTo(shape.p.x + size, shape.p.y - size);
    ctx.stroke();
  },
  createSVGElementInfo(shape) {
    const size = radius * 0.5;

    return {
      tag: "g",
      attributes: {
        transform: renderTransform([1, 0, 0, 1, shape.p.x, shape.p.y]),
      },
      children: [
        {
          tag: "ellipse",
          attributes: {
            rx: radius,
            ry: radius,
            ...renderFillSVGAttributes({ color: COLORS.GRAY_1 }),
            ...renderStrokeSVGAttributes({ color: COLORS.BLACK, width: lineWidth }),
          },
        },
        {
          tag: "line",
          attributes: {
            x1: -size,
            y1: -size,
            x2: size,
            y2: size,
            ...renderStrokeSVGAttributes({ color: COLORS.BLACK, width: lineWidth }),
          },
        },
        {
          tag: "line",
          attributes: {
            x1: -size,
            y1: size,
            x2: size,
            y2: -size,
            ...renderStrokeSVGAttributes({ color: COLORS.BLACK, width: lineWidth }),
          },
        },
      ],
    };
  },
  getWrapperRect(shape, includeBounds) {
    const rect = { x: shape.p.x - radius, y: shape.p.y - radius, width: radius * 2, height: radius * 2 };
    return includeBounds ? expandRect(rect, lineWidth / 2) : rect;
  },
  getLocalRectPolygon(shape) {
    return getRectPoints(struct.getWrapperRect(shape));
  },
  isPointOn(shape, p) {
    return getD2(sub(shape.p, p)) <= radius * radius;
  },
  resize(shape, resizingAffine) {
    const p = applyAffine(resizingAffine, shape.p);

    const ret: Partial<Shape> = {};
    if (!isSame(p, shape.p)) ret.p = p;

    return ret;
  },
};
