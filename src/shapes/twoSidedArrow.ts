import { IVec2, add, sub, rotate } from "okageo";
import { ShapeStruct, createBaseShape } from "./core";
import {
  SimplePath,
  SimplePolygonShape,
  getNormalizedSimplePolygonShape,
  getSimpleShapeTextRangeRect,
  getStructForSimplePolygon,
} from "./simplePolygon";
import { createBoxPadding } from "../utils/boxPadding";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { Shape } from "../models";
import { getRotateFn } from "../utils/geometry";

/**
 * Suppose the heads face horizontally.
 */
export type TwoSidedArrowShape = SimplePolygonShape & {
  /**
   * Relative rate in the shape.
   * - The bigger x, the bigger length of the head.
   * - The bigger y, the smaller depth of the head.
   */
  headControl: IVec2;
};

export const struct: ShapeStruct<TwoSidedArrowShape> = {
  ...getStructForSimplePolygon<TwoSidedArrowShape>(getPath),
  label: "TwoSidedArrow",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "two_sided_arrow",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 50,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      headControl: arg.headControl ?? { x: 0.75, y: 0.25 },
      direction: arg.direction ?? 1,
    };
  },
  getTextRangeRect(shape) {
    return getSimpleShapeTextRangeRect(shape, (s) => {
      const halfHeight = s.height / 2;
      const headDepth = s.height * s.headControl.y;
      const headLength = s.width * (1 - s.headControl.x);
      const bodyHeight = s.height - headDepth * 2;
      const headPadding = (bodyHeight / 2) * (headLength / halfHeight);
      return {
        x: s.p.x + headPadding,
        y: s.p.y + headDepth,
        width: s.width - headPadding * 2,
        height: bodyHeight,
      };
    });
  },
};

function getPath(src: TwoSidedArrowShape): SimplePath {
  const shape = getNormalizedSimplePolygonShape(src);
  const halfWidth = shape.width / 2;
  const halfHeight = shape.height / 2;
  const c = { x: shape.p.x + halfWidth, y: shape.p.y + halfHeight };

  const headDepth = shape.height * shape.headControl.y;
  const headLength = shape.width * (1 - shape.headControl.x);
  const bodyHeight = shape.height - headDepth * 2;
  const halfBodyHeight = bodyHeight / 2;

  const path = [
    { x: shape.p.x + headLength, y: c.y - halfBodyHeight },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y + headDepth },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y },
    { x: shape.p.x + shape.width, y: c.y },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y + shape.height },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y + shape.height - headDepth },
    { x: shape.p.x + headLength, y: c.y + halfBodyHeight },
    { x: shape.p.x + headLength, y: c.y + halfHeight },
    { x: shape.p.x, y: c.y },
    { x: shape.p.x + headLength, y: c.y - halfHeight },
  ];
  // "src.rotation" should be removed here because this function should return original path.
  const rotateFn = getRotateFn(shape.rotation - src.rotation, c);
  return { path: path.map((p) => sub(rotateFn(p), src.p)) };
}

export function getHeadControlPoint(src: TwoSidedArrowShape): IVec2 {
  const shape = getNormalizedSimplePolygonShape(src);
  const c = { x: shape.width / 2, y: shape.height / 2 };
  const relativeP = { x: shape.width * shape.headControl.x, y: shape.height * shape.headControl.y };
  return add(rotate(relativeP, shape.rotation, c), shape.p);
}

export function isTwoSidedArrowShape(shape: Shape): shape is TwoSidedArrowShape {
  return shape.type === "two_sided_arrow";
}
