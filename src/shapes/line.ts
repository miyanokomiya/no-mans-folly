import { IVec2, applyAffine, getOuterRectangle, isSame } from "okageo";
import { FillStyle, Shape, StrokeStyle } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { getRectPoints, isPointCloseToSegment } from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";

export interface LineShape extends Shape {
  fill: FillStyle;
  stroke: StrokeStyle;
  q: IVec2;
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
      q: { x: 100, y: 0 },
    };
  },
  render(ctx, shape) {
    applyStrokeStyle(ctx, shape.stroke);

    ctx.beginPath();
    getPath(shape).forEach((p) => {
      ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  },
  getWrapperRect(shape) {
    return getOuterRectangle([getPath(shape)]);
  },
  getLocalRectPolygon(shape) {
    return getRectPoints(getOuterRectangle([getPath(shape)]));
  },
  isPointOn(shape, p) {
    return isPointCloseToSegment(getPath(shape), p, 10);
  },
  resize(shape, resizingAffine) {
    const [p, q] = getPath(shape).map((p) => applyAffine(resizingAffine, p));

    const ret: Partial<LineShape> = {};
    if (!isSame(p, shape.p)) ret.p = p;
    if (!isSame(q, shape.q)) ret.q = q;

    return ret;
  },
};

function getPath(shape: LineShape): IVec2[] {
  return [shape.p, shape.q];
}
