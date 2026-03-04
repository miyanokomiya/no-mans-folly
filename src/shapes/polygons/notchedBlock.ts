import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { clamp, IVec2 } from "okageo";
import { getRectPoints } from "../../utils/geometry";

export type NotchedBlockShape = SimplePolygonShape & {
  c0: IVec2; // Represents the top-left of the notch
};

export const struct: ShapeStruct<NotchedBlockShape> = {
  ...getStructForSimplePolygon<NotchedBlockShape>(getPath),
  label: "NotchedBlock",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "notched_block",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 150,
      height: arg.height ?? 100,
      c0: arg.c0 ?? { x: 1 / 3, y: 1 / 2 },
    };
  },
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getPath(shape: NotchedBlockShape): SimplePath {
  const c0x = clamp(0, 0.5, shape.c0.x);
  const c0y = clamp(0, 1, shape.c0.y);

  // Fallback to rectangle when either coord of "c0" is zero
  if (c0x <= 0) {
    return {
      path: getRectPoints({
        x: 0,
        y: shape.height * c0y,
        width: shape.width,
        height: shape.height * (1 - c0y),
      }),
    };
  }
  if (c0y <= 0) {
    return {
      path: getRectPoints({ x: 0, y: 0, width: shape.width, height: shape.height }),
    };
  }

  const cx = shape.width * c0x;
  const cy = shape.height * c0y;
  return {
    path: [
      { x: 0, y: 0 },
      { x: cx, y: 0 },
      { x: cx, y: cy },
      { x: shape.width - cx, y: cy },
      { x: shape.width - cx, y: 0 },
      { x: shape.width, y: 0 },
      { x: shape.width, y: shape.height },
      { x: 0, y: shape.height },
    ],
  };
}
