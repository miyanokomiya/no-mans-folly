import {
  IRectangle,
  IVec2,
  applyAffine,
  getCenter,
  getDistance,
  getRadian,
  getRectCenter,
  isSame,
  rotate,
} from "okageo";
import { CommonStyle, Shape } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import {
  getClosestOutlineOnRectangle,
  getRectPoints,
  getRotateFn,
  getRotatedWrapperRect,
  isPointOnRectangleRotated,
  getCrossSegAndSeg,
  ISegment,
  sortPointFrom,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape, getCommonStyle, updateCommonStyle } from "./core";

export type RectangleShape = Shape &
  CommonStyle & {
    width: number;
    height: number;
  };

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
  getTextRangeRect(shape) {
    return { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  },
  isPointOn(shape, p) {
    return isPointOnRectangleRotated(
      { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height },
      shape.rotation,
      p
    );
  },
  resize(shape, resizingAffine) {
    const rectPolygon = getLocalRectPolygon(shape).map((p) => applyAffine(resizingAffine, p));
    const center = getCenter(rectPolygon[0], rectPolygon[2]);
    const width = getDistance(rectPolygon[0], rectPolygon[1]);
    const height = getDistance(rectPolygon[0], rectPolygon[3]);
    const p = { x: center.x - width / 2, y: center.y - height / 2 };
    const rotation = getRadian(rectPolygon[1], rectPolygon[0]);

    const ret: Partial<RectangleShape> = {};
    if (!isSame(p, shape.p)) ret.p = p;
    if (width !== shape.width) ret.width = width;
    if (height !== shape.height) ret.height = height;
    if (rotation !== shape.rotation) ret.rotation = rotation;

    return ret;
  },
  getClosestOutline(shape, p, threshold) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const center = getRectCenter(rect);
    const rotateFn = getRotateFn(shape.rotation, center);
    const rotatedP = rotateFn(p, true);

    {
      const markers = getMarkers(rect, center);
      const rotatedClosest = markers.find((m) => getDistance(m, rotatedP) <= threshold);
      if (rotatedClosest) return rotateFn(rotatedClosest);
    }

    {
      const rotatedClosest = getClosestOutlineOnRectangle(rect, rotatedP, threshold);
      if (rotatedClosest) return rotateFn(rotatedClosest);
    }
  },
  getIntersectedOutlines(shape, from, to) {
    const polygon = getLocalRectPolygon(shape);
    const seg: ISegment = [from, to];
    const ret: IVec2[] = [];

    polygon.forEach((p, i) => {
      const s = getCrossSegAndSeg([p, polygon[(i + 1) % polygon.length]], seg);
      if (!s) return;
      ret.push(s);
    });

    return ret.length === 0 ? undefined : sortPointFrom(from, ret);
  },
  getCommonStyle,
  updateCommonStyle,
};

function getLocalRectPolygon(shape: RectangleShape): IVec2[] {
  const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const c = getRectCenter(rect);
  return getRectPoints(rect).map((p) => rotate(p, shape.rotation, c));
}

function getMarkers(rect: IRectangle, center: IVec2): IVec2[] {
  return [
    { x: rect.x, y: rect.y },
    { x: center.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: center.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: center.x, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x, y: center.y },
  ];
}
