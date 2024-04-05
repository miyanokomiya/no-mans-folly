import { IVec2, add, clamp, sub } from "okageo";
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

export type ParallelogramShape = SimplePolygonShape & {
  c0: IVec2;
};

export const struct: ShapeStruct<ParallelogramShape> = {
  ...getStructForSimplePolygon<ParallelogramShape>(getPath),
  label: "Parallelogram",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "parallelogram",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 0.7, y: 0 },
      direction: arg.direction,
    };
  },
  getTextRangeRect(shape) {
    switch (shape.direction) {
      case 0: {
        const d = shape.height * Math.abs(shape.c0.x - 0.5);
        const innerTop = d;
        const innerBottom = shape.height - d;
        const rect = {
          x: shape.p.x,
          y: shape.p.y + innerTop,
          width: shape.width,
          height: innerBottom - innerTop,
        };
        return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
      }
      default: {
        const d = shape.width * Math.abs(shape.c0.x - 0.5);
        const innerLeft = d;
        const innerRight = shape.width - d;
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

function getPath(src: ParallelogramShape): SimplePath {
  if (src.direction === undefined || src.direction === 1) return getRawPath(src);

  const shape = getNormalizedSimplePolygonShape(src);
  const c = { x: src.width / 2, y: src.height / 2 };
  const rotateFn = getRotateFn(shape.rotation - src.rotation, add(c, src.p));
  const { path } = getRawPath(shape);
  return { path: path.map((p) => sub(rotateFn(add(p, shape.p)), src.p)) };
}

function getRawPath(shape: ParallelogramShape): SimplePath {
  const dx = (clamp(0, 1, shape.c0.x) - 0.5) * shape.width;

  let path: IVec2[];

  if (dx < 0) {
    path = [
      { x: 0, y: 0 },
      { x: shape.width + dx, y: 0 },
      { x: shape.width, y: shape.height },
      { x: -dx, y: shape.height },
    ];
  } else {
    path = [
      { x: dx, y: 0 },
      { x: shape.width, y: 0 },
      { x: shape.width - dx, y: shape.height },
      { x: 0, y: shape.height },
    ];
  }

  return { path };
}
