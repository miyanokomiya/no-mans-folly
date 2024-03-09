import { IVec2 } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
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
    const { path } = getPath(shape);
    const innerLeft = Math.max(path[0].x, path[3].x);
    const innerRight = Math.min(path[1].x, path[2].x);
    const rect = {
      x: shape.p.x + innerLeft,
      y: shape.p.y,
      width: innerRight - innerLeft,
      height: shape.height,
    };
    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
  canAttachSmartBranch: true,
};

function getPath(shape: TrapezoidShape): SimplePath {
  return {
    path: [
      { x: shape.width * shape.c0.x, y: shape.height * shape.c0.y },
      { x: shape.width * shape.c1.x, y: shape.height * shape.c1.y },
      { x: shape.width, y: shape.height },
      { x: 0, y: shape.height },
    ],
  };
}
