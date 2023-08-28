import { IVec2, applyAffine, getOuterRectangle, isSame } from "okageo";
import { ConnectionPoint, FillStyle, Shape, StrokeStyle } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { getRectPoints, isPointCloseToSegment } from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";

export interface LineShape extends Shape {
  fill: FillStyle;
  stroke: StrokeStyle;
  q: IVec2;
  pConnection?: ConnectionPoint;
  qConnection?: ConnectionPoint;
}

export const struct: ShapeStruct<LineShape> = {
  label: "Line",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "line",
      rotation: 0, // should always be "0" or just ignored
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      q: arg.q ?? { x: 100, y: 0 },
    };
  },
  render(ctx, shape) {
    applyStrokeStyle(ctx, shape.stroke);

    ctx.beginPath();
    getLinePath(shape).forEach((p) => {
      ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  },
  getWrapperRect(shape) {
    return getOuterRectangle([getLinePath(shape)]);
  },
  getLocalRectPolygon(shape) {
    return getRectPoints(getOuterRectangle([getLinePath(shape)]));
  },
  isPointOn(shape, p) {
    return isPointCloseToSegment(getLinePath(shape), p, 10);
  },
  resize(shape, resizingAffine) {
    const [p, q] = getLinePath(shape).map((p) => applyAffine(resizingAffine, p));

    const ret: Partial<LineShape> = {};
    if (!isSame(p, shape.p)) ret.p = p;
    if (!isSame(q, shape.q)) ret.q = q;

    return ret;
  },
};

export function getLinePath(shape: LineShape): IVec2[] {
  return [shape.p, shape.q];
}

export function patchVertex(shape: LineShape, index: number, p: IVec2): Partial<LineShape> {
  const vertices = getLinePath(shape);
  switch (index) {
    case 0:
      return { p };
    case vertices.length - 1:
      return { q: p };
    default:
      return {};
  }
}
