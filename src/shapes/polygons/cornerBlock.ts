import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getDirectionalSimplePath, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { IVec2 } from "okageo";
import { getRectPoints } from "../../utils/geometry";

export type CornerBlockShape = SimplePolygonShape & {
  c0: IVec2;
};

export const struct: ShapeStruct<CornerBlockShape> = {
  ...getStructForSimplePolygon<CornerBlockShape>(getPath),
  label: "CornerBlock",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "corner_block",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      c0: arg.c0 ?? { x: 0.5, y: 0.5 }, // Represents the corner at the top-left
      direction: arg.direction ?? 1,
    };
  },
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getPath(src: CornerBlockShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

function getRawPath(shape: CornerBlockShape): SimplePath {
  if (shape.c0.x <= 0 || shape.c0.y <= 0) {
    // Fallback to rectangle when either coord of "c0" is zero
    return {
      path: getRectPoints({ x: 0, y: 0, width: shape.width, height: shape.height }),
    };
  }

  const cx = shape.width * shape.c0.x;
  const cy = shape.height * shape.c0.y;
  return {
    path: [
      { x: cx, y: 0 },
      { x: shape.width, y: 0 },
      { x: shape.width, y: shape.height },
      { x: 0, y: shape.height },
      { x: 0, y: cy },
      { x: cx, y: cy },
    ],
  };
}
