import { FillStyle, Shape, StrokeStyle } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import { isPointOnRectangle } from "../utils/geometry";
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
    ctx.fillRect(shape.p.x, shape.p.y, shape.width, shape.height);
    applyStrokeStyle(ctx, shape.stroke);
    ctx.strokeRect(shape.p.x, shape.p.y, shape.width, shape.height);
  },
  getRect(shape) {
    return { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  },
  isPointOn(shape, p) {
    return isPointOnRectangle({ x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height }, p);
  },
};
