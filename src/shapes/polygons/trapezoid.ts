import { IVec2 } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import {
  SimplePath,
  SimplePolygonShape,
  getDirectionalSimplePath,
  getSimpleShapeTextRangeRect,
  getStructForSimplePolygon,
} from "../simplePolygon";
import { createBoxPadding } from "../../utils/boxPadding";
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
      direction: arg.direction,
    };
  },
  getTextRangeRect(shape) {
    return getSimpleShapeTextRangeRect(shape, (s) => {
      const innerLeft = s.width * s.c0.x;
      const innerRight = s.width * s.c1.x;
      return {
        x: s.p.x + innerLeft,
        y: s.p.y,
        width: innerRight - innerLeft,
        height: s.height,
      };
    });
  },
  canAttachSmartBranch: true,
};

function getPath(src: TrapezoidShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

function getRawPath(shape: TrapezoidShape): SimplePath {
  const path = [
    { x: shape.width * shape.c0.x, y: shape.height * shape.c0.y },
    { x: shape.width * shape.c1.x, y: shape.height * shape.c1.y },
    { x: shape.width, y: shape.height },
    { x: 0, y: shape.height },
  ];
  return { path };
}
