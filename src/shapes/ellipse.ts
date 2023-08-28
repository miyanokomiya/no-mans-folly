import { IVec2, add, applyAffine, getCenter, getDistance, getRadian, isSame, rotate, sub } from "okageo";
import { FillStyle, Shape, StrokeStyle } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import {
  getClosestOutlineOnEllipse,
  getRectPoints,
  getRotatedWrapperRect,
  isPointOnEllipseRotated,
} from "../utils/geometry";
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
    ctx.ellipse(shape.p.x + shape.rx, shape.p.y + shape.ry, shape.rx, shape.ry, shape.rotation, shape.from, shape.to);
    ctx.fill();
    ctx.stroke();
  },
  getWrapperRect(shape) {
    return getRotatedWrapperRect(
      {
        x: shape.p.x,
        y: shape.p.y,
        width: 2 * shape.rx,
        height: 2 * shape.ry,
      },
      shape.rotation
    );
  },
  getLocalRectPolygon,
  isPointOn(shape, p) {
    const c = add(shape.p, { x: shape.rx, y: shape.ry });
    return isPointOnEllipseRotated(c, shape.rx, shape.ry, shape.rotation, p);
  },
  resize(shape, resizingAffine) {
    const rectPolygon = getLocalRectPolygon(shape).map((p) => applyAffine(resizingAffine, p));
    const c = getCenter(rectPolygon[0], rectPolygon[2]);
    const rx = getDistance(rectPolygon[0], rectPolygon[1]) / 2;
    const ry = getDistance(rectPolygon[0], rectPolygon[3]) / 2;
    const p = sub(c, { x: rx, y: ry });
    const rotation = getRadian(rectPolygon[1], rectPolygon[0]);

    const ret: Partial<EllipseShape> = {};
    if (!isSame(p, shape.p)) ret.p = p;
    if (rx !== shape.rx) ret.rx = rx;
    if (ry !== shape.ry) ret.ry = ry;
    if (rotation !== shape.rotation) ret.rotation = rotation;

    return ret;
  },
  getClosestOutline(shape, p, threshold) {
    const center = add(shape.p, { x: shape.rx, y: shape.ry });
    const rotatedP = shape.rotation === 0 ? p : rotate(p, -shape.rotation, center);
    const rotatedClosest = getClosestOutlineOnEllipse(center, shape.rx, shape.ry, rotatedP, threshold);
    if (!rotatedClosest) return;

    return shape.rotation === 0 ? rotatedClosest : rotate(rotatedClosest, shape.rotation, center);
  },
};

function getLocalRectPolygon(shape: EllipseShape): IVec2[] {
  const c = add(shape.p, { x: shape.rx, y: shape.ry });
  return getRectPoints({
    x: shape.p.x,
    y: shape.p.y,
    width: 2 * shape.rx,
    height: 2 * shape.ry,
  }).map((p) => rotate(p, shape.rotation, c));
}
