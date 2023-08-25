import { IVec2, applyAffine, getCenter, getDistance, getRectCenter, rotate } from "okageo";
import { FillStyle, Shape, StrokeStyle } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import { getRectPoints, getRotatedWrapperRect, isPointOnRectangle } from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";

export interface RectangleShape extends Shape {
  fill: FillStyle;
  stroke: StrokeStyle;
  width: number;
  height: number;
}

export const struct: ShapeStruct<RectangleShape> = {
  label: "Rectangle",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "rectangle",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
    };
  },
  render(ctx, shape) {
    applyFillStyle(ctx, shape.fill);
    applyStrokeStyle(ctx, shape.stroke);

    const rectPolygon = getLocalRectPolygon(shape);
    ctx.beginPath();
    rectPolygon.forEach((p) => {
      ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  getWrapperRect(shape) {
    return getRotatedWrapperRect(
      { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height },
      shape.rotation
    );
  },
  getLocalRectPolygon,
  isPointOn(shape, p) {
    return isPointOnRectangle({ x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height }, p);
  },
  resizeLocal(shape, resizingAffine) {
    const rectPolygon = getLocalRectPolygon(shape).map((p) => applyAffine(resizingAffine, p));
    const center = getCenter(rectPolygon[0], rectPolygon[2]);
    const width = getDistance(rectPolygon[0], rectPolygon[1]);
    const height = getDistance(rectPolygon[0], rectPolygon[3]);
    const p = { x: center.x - width / 2, y: center.y - height / 2 };
    return { p, width, height };
  },
};

function getLocalRectPolygon(shape: RectangleShape): IVec2[] {
  const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const c = getRectCenter(rect);
  return getRectPoints(rect).map((p) => rotate(p, shape.rotation, c));
}
