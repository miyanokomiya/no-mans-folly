import { IVec2 } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";

export type TrapezoidShape = SimplePolygonShape & {
  c0: IVec2; // Relative rate from "p"
  c1: IVec2; // Same as c0
};

export const struct: ShapeStruct<TrapezoidShape> = {
  ...getStructForSimplePolygon<TrapezoidShape>(getPath),
  label: "Trapezoid",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "trapezoid",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 0.2, y: 0 },
      c1: arg.c1 ?? { x: 0.8, y: 0 },
    };
  },
  getTextRangeRect(shape) {
    const path = getPath(shape);
    const rect = {
      x: path[0].x,
      y: shape.p.y,
      width: path[1].x - path[0].x,
      height: shape.height,
    };
    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
  canAttachSmartBranch: true,
};

function getPath(shape: TrapezoidShape): IVec2[] {
  return [
    { x: shape.p.x + shape.width * shape.c0.x, y: shape.p.y + shape.height * shape.c0.y },
    { x: shape.p.x + shape.width * shape.c1.x, y: shape.p.y + shape.height * shape.c1.y },
    { x: shape.p.x + shape.width, y: shape.p.y + shape.height },
    { x: shape.p.x, y: shape.p.y + shape.height },
  ];
}
