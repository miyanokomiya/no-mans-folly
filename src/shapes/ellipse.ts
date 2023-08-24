import { rotate } from "okageo";
import { FillStyle, Shape, StrokeStyle } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import { getRectPoints, getRotatedWrapperRect, isPointOnEllipse } from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";

export interface EllipseShape extends Shape {
  fill: FillStyle;
  stroke: StrokeStyle;
  rx: number;
  ry: number;
  from: number;
  to: number;
}

export const struct: ShapeStruct<EllipseShape> = {
  label: "Ellipse",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "ellipse",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      rx: arg.rx ?? 50,
      ry: arg.ry ?? 50,
      from: arg.from ?? 0,
      to: arg.to ?? Math.PI * 2,
    };
  },
  render(ctx, shape) {
    applyFillStyle(ctx, shape.fill);
    applyStrokeStyle(ctx, shape.stroke);
    ctx.beginPath();
    ctx.ellipse(shape.p.x, shape.p.y, shape.rx, shape.ry, shape.rotation, shape.from, shape.to);
    ctx.fill();
    ctx.stroke();
  },
  getWrapperRect(shape) {
    return getRotatedWrapperRect(
      {
        x: shape.p.x - shape.rx,
        y: shape.p.y - shape.ry,
        width: 2 * shape.rx,
        height: 2 * shape.ry,
      },
      shape.rotation
    );
  },
  getLocalRectPolygon(shape) {
    return getRectPoints({
      x: shape.p.x - shape.rx,
      y: shape.p.y - shape.ry,
      width: 2 * shape.rx,
      height: 2 * shape.ry,
    }).map((p) => rotate(p, shape.rotation, shape.p));
  },
  isPointOn(shape, p) {
    return isPointOnEllipse(shape.p, shape.rx, shape.ry, p);
  },
};
