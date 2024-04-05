import { IVec2, add, sub } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import {
  SimplePath,
  SimplePolygonShape,
  getNormalizedSimplePolygonShape,
  getStructForSimplePolygon,
} from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { getRotateFn } from "../../utils/geometry";

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
    switch (shape.direction) {
      case 0: {
        const innerTop = shape.height * (1 - shape.c1.x);
        const innerBottom = shape.height * (1 - shape.c0.x);
        const rect = {
          x: shape.p.x,
          y: shape.p.y + innerTop,
          width: shape.width,
          height: innerBottom - innerTop,
        };
        return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
      }
      case 2: {
        const innerTop = shape.height * shape.c0.x;
        const innerBottom = shape.height * shape.c1.x;
        const rect = {
          x: shape.p.x,
          y: shape.p.y + innerTop,
          width: shape.width,
          height: innerBottom - innerTop,
        };
        return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
      }
      case 3: {
        const innerLeft = shape.width * (1 - shape.c1.x);
        const innerRight = shape.width * (1 - shape.c0.x);
        const rect = {
          x: shape.p.x + innerLeft,
          y: shape.p.y,
          width: innerRight - innerLeft,
          height: shape.height,
        };
        return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
      }
      default: {
        const innerLeft = shape.width * shape.c0.x;
        const innerRight = shape.width * shape.c1.x;
        const rect = {
          x: shape.p.x + innerLeft,
          y: shape.p.y,
          width: innerRight - innerLeft,
          height: shape.height,
        };
        return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
      }
    }
  },
  canAttachSmartBranch: true,
};

function getPath(src: TrapezoidShape): SimplePath {
  const shape = getNormalizedSimplePolygonShape(src);
  const { path } = getRawPath(shape);
  const c = { x: src.width / 2, y: src.height / 2 };
  const rotateFn = getRotateFn(shape.rotation - src.rotation, add(c, src.p));
  return { path: path.map((p) => sub(rotateFn(add(p, shape.p)), src.p)) };
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
