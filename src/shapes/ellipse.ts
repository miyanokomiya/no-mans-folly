import { IVec2, add, applyAffine, getCenter, getDistance, getRadian, isSame, rotate, sub } from "okageo";
import { CommonStyle, Shape } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import {
  TAU,
  expandRect,
  getClosestOutlineOnEllipse,
  getCrossLineAndEllipseRotated,
  getRectPoints,
  getRotateFn,
  getRotatedWrapperRect,
  isPointOnEllipseRotated,
  sortPointFrom,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape, getCommonStyle, updateCommonStyle } from "./core";

export type EllipseShape = Shape &
  CommonStyle & {
    rx: number;
    ry: number;
    from: number;
    to: number;
  };

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
      to: arg.to ?? TAU,
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
  getWrapperRect(shape, includeBounds) {
    let rect = {
      x: shape.p.x,
      y: shape.p.y,
      width: 2 * shape.rx,
      height: 2 * shape.ry,
    };
    if (includeBounds) {
      rect = expandRect(rect, getStrokeWidth(shape.stroke) / 2);
    }
    return getRotatedWrapperRect(rect, shape.rotation);
  },
  getLocalRectPolygon,
  getTextRangeRect(shape) {
    const c = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
    const r = Math.PI / 4;
    const dx = Math.cos(r) * shape.rx;
    const dy = Math.sin(r) * shape.ry;
    return { x: c.x - dx, y: c.y - dy, width: dx * 2, height: dy * 2 };
  },
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
  getClosestOutline,
  getIntersectedOutlines(shape, from, to) {
    const center = add(shape.p, { x: shape.rx, y: shape.ry });
    const points = getCrossLineAndEllipseRotated([from, to], center, shape.rx, shape.ry, shape.rotation);
    if (!points) return;

    return points.length === 0 ? undefined : sortPointFrom(from, points);
  },
  getCommonStyle,
  updateCommonStyle,
  canAttachSmartBranch: true,
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

function getMarkers(center: IVec2, rx: number, ry: number): IVec2[] {
  return [
    { x: center.x, y: center.y - ry },
    { x: center.x + rx, y: center.y },
    { x: center.x, y: center.y + ry },
    { x: center.x - rx, y: center.y },
  ];
}

function getClosestOutline(shape: EllipseShape, p: IVec2, threshold: number): IVec2 | undefined {
  const center = add(shape.p, { x: shape.rx, y: shape.ry });
  const rotateFn = getRotateFn(shape.rotation, center);
  const rotatedP = rotateFn(p, true);

  {
    const markers = getMarkers(center, shape.rx, shape.ry);
    const rotatedClosest = markers.find((m) => getDistance(m, rotatedP) <= threshold);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }

  {
    const rotatedClosest = getClosestOutlineOnEllipse(center, shape.rx, shape.ry, rotatedP, threshold);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }
}
