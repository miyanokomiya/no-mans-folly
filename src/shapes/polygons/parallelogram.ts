import { IVec2, clamp } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";

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

function getPath(shape: ParallelogramShape): SimplePath {
  const dx = (clamp(0, 1, shape.c0.x) - 0.5) * shape.width;

  if (dx < 0) {
    return {
      path: [
        { x: 0, y: 0 },
        { x: shape.width + dx, y: 0 },
        { x: shape.width, y: shape.height },
        { x: -dx, y: shape.height },
      ],
    };
  }

  return {
    path: [
      { x: dx, y: 0 },
      { x: shape.width, y: 0 },
      { x: shape.width - dx, y: shape.height },
      { x: 0, y: shape.height },
    ],
  };
}
