import { IVec2, clamp } from "okageo";
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

export type HexagonShape = SimplePolygonShape & {
  c0: IVec2;
};

export const struct: ShapeStruct<HexagonShape> = {
  ...getStructForSimplePolygon<HexagonShape>(getPath),
  label: "Hexagon",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "hexagon",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100 * (Math.sqrt(3) / 2),
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 1 / 4, y: 0.5 },
      direction: arg.direction,
    };
  },
  getTextRangeRect(shape) {
    return getSimpleShapeTextRangeRect(shape, (s) => {
      const dx = s.width * clamp(0, 0.5, s.c0.x);
      const innerLeft = dx;
      const innerRight = s.width - dx;
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

function getPath(src: HexagonShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

function getRawPath(shape: HexagonShape): SimplePath {
  const dx = shape.width * clamp(0, 0.5, shape.c0.x);
  const dy = shape.height * clamp(0, 0.5, shape.c0.y);

  const path = [
    { x: dx, y: 0 },
    { x: shape.width - dx, y: 0 },

    { x: shape.width, y: dy },
    ...(shape.c0.y !== 0.5 ? [{ x: shape.width, y: shape.height - dy }] : []),

    { x: shape.width - dx, y: shape.height },
    { x: dx, y: shape.height },

    { x: 0, y: shape.height - dy },
    ...(shape.c0.y !== 0.5 ? [{ x: 0, y: dy }] : []),
  ];
  return { path };
}
