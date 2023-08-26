import { IVec2, applyAffine, getCenter, getDistance, rotate } from "okageo";
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
  getLocalRectPolygon,
  isPointOn(shape, p) {
    return isPointOnEllipse(shape.p, shape.rx, shape.ry, p);
  },
  resize(shape, resizingAffine) {
    const rectPolygon = getLocalRectPolygon(shape).map((p) => applyAffine(resizingAffine, p));
    const center = getCenter(rectPolygon[0], rectPolygon[2]);
    const width = getDistance(rectPolygon[0], rectPolygon[1]);
    const height = getDistance(rectPolygon[0], rectPolygon[3]);
    return { p: center, rx: width / 2, ry: height / 2 };
  },
};

function getLocalRectPolygon(shape: EllipseShape): IVec2[] {
  return getRectPoints({
    x: shape.p.x - shape.rx,
    y: shape.p.y - shape.ry,
    width: 2 * shape.rx,
    height: 2 * shape.ry,
  }).map((p) => rotate(p, shape.rotation, shape.p));
}
