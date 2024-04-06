import { IVec2 } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getDirectionalSimplePath, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
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
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 1 / (2 + Math.sqrt(3)), y: 0.5 },
      direction: arg.direction,
    };
  },
  getTextRangeRect(shape) {
    switch (shape.direction) {
      case 0: {
        const dy = shape.height * shape.c0.y;
        const innerTop = dy;
        const innerBottom = shape.height - dy;
        const rect = {
          x: shape.p.x,
          y: shape.p.y + innerTop,
          width: shape.width,
          height: innerBottom - innerTop,
        };
        return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
      }
      default: {
        const dx = shape.width * shape.c0.x;
        const innerLeft = dx;
        const innerRight = shape.width - dx;
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

function getPath(src: HexagonShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

function getRawPath(shape: HexagonShape): SimplePath {
  const dx = shape.width * shape.c0.x;
  const dy = shape.height * shape.c0.y;

  const path = [
    { x: dx, y: 0 },
    { x: shape.width - dx, y: 0 },

    { x: shape.width, y: dy },
    ...(dy !== 0.5 ? [{ x: shape.width, y: shape.height - dy }] : []),

    { x: shape.width - dx, y: shape.height },
    { x: dx, y: shape.height },

    { x: 0, y: dy },
    ...(dy !== 0.5 ? [{ x: 0, y: shape.height - dy }] : []),
  ];
  return { path };
}
