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

export type ChevronShape = SimplePolygonShape & {
  c0: IVec2;
};

export const struct: ShapeStruct<ChevronShape> = {
  ...getStructForSimplePolygon(getPath),
  label: "Chevron",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "chevron",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 0.8, y: 0 },
    };
  },
  getTextRangeRect(shape) {
    return getSimpleShapeTextRangeRect(shape, (s) => {
      const headSize = getHeadSize(shape);
      return {
        x: s.p.x + headSize,
        y: s.p.y,
        width: s.width - 2 * headSize,
        height: s.height,
      };
    });
  },
  canAttachSmartBranch: true,
};

function getPath(src: ChevronShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

function getRawPath(shape: ChevronShape): SimplePath {
  const headSize = getHeadSize(shape);
  return {
    path: [
      { x: 0, y: 0 },
      { x: shape.width - headSize, y: 0 },
      { x: shape.width, y: shape.height / 2 },
      { x: shape.width - headSize, y: shape.height },
      { x: 0, y: shape.height },
      { x: headSize, y: shape.height / 2 },
    ],
  };
}

function getHeadSize(shape: ChevronShape): number {
  return shape.width * clamp(0, 1, 1 - shape.c0.x);
}
