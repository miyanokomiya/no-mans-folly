import { IRectangle, IVec2, add, rotate, sub } from "okageo";
import { ShapeStruct, createBaseShape } from "./core";
import {
  SimplePath,
  SimplePolygonShape,
  getNormalizedSimplePolygonShape,
  getStructForSimplePolygon,
} from "./simplePolygon";
import { createBoxPadding, getPaddingRect } from "../utils/boxPadding";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { Shape } from "../models";
import { getRotateFn } from "../utils/geometry";

/**
 * Suppose the head faces toward right by default.
 * => "width" represents length of the arrow.
 */
export type OneSidedArrowShape = SimplePolygonShape & {
  /**
   * Relative rate in the shape.
   * - The bigger x, the smaller length of the head.
   * - The bigger y, the smaller depth of the head.
   */
  headControl: IVec2;
  /**
   * Relative rate in the shape.
   * - x has no role.
   * - The smaller y, the skewer the tail of the arrow.
   */
  tailControl: IVec2;
};

export const struct: ShapeStruct<OneSidedArrowShape> = {
  ...getStructForSimplePolygon<OneSidedArrowShape>(getPath),
  label: "OneSidedArrow",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "one_sided_arrow",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 50,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      headControl: arg.headControl ?? { x: 0.75, y: 0.25 },
      tailControl: arg.tailControl ?? { x: 0, y: 0 },
      direction: arg.direction ?? 1,
    };
  },
  getTextRangeRect(shape) {
    const halfWidth = shape.width / 2;
    const halfHeight = shape.height / 2;
    let rect: IRectangle;

    if (shape.direction === 0 || shape.direction === 2) {
      const headDepth = shape.width * shape.headControl.y;
      const headLength = shape.height * (1 - shape.headControl.x);
      const bodyHeight = shape.width - headDepth * 2;
      const headPadding = (bodyHeight / 2) * (headLength / halfWidth);
      rect = {
        x: shape.p.x + headDepth,
        y: shape.direction === 0 ? shape.p.y + headPadding : shape.p.y,
        width: bodyHeight,
        height: shape.height - headPadding,
      };
    } else {
      const headDepth = shape.height * shape.headControl.y;
      const headLength = shape.width * (1 - shape.headControl.x);
      const bodyHeight = shape.height - headDepth * 2;
      const headPadding = (bodyHeight / 2) * (headLength / halfHeight);
      rect = {
        x: shape.direction === 3 ? shape.p.x + headPadding : shape.p.x,
        y: shape.p.y + headDepth,
        width: shape.width - headPadding,
        height: bodyHeight,
      };
    }

    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
};

function getPath(src: OneSidedArrowShape): SimplePath {
  const shape = getNormalizedSimplePolygonShape(src);
  const halfWidth = shape.width / 2;
  const halfHeight = shape.height / 2;
  const c = { x: shape.p.x + halfWidth, y: shape.p.y + halfHeight };

  const headDepth = shape.height * shape.headControl.y;
  const headLength = shape.width * (1 - shape.headControl.x);
  const bodyHeight = shape.height - headDepth * 2;
  const tailHeight = Math.min(bodyHeight, shape.height * (1 - 2 * shape.tailControl.y));
  const halfTailHeight = tailHeight / 2;

  const path = [
    { x: shape.p.x, y: c.y - halfTailHeight },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y + headDepth },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y },
    { x: shape.p.x + shape.width, y: c.y },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y + shape.height },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y + shape.height - headDepth },
    { x: shape.p.x, y: c.y + halfTailHeight },
  ];
  // "src.rotation" should be removed here because this function should return original path.
  const rotateFn = getRotateFn(shape.rotation - src.rotation, c);
  return { path: path.map((p) => sub(rotateFn(p), src.p)) };
}

export function getHeadControlPoint(src: OneSidedArrowShape): IVec2 {
  const shape = getNormalizedSimplePolygonShape(src);
  const c = { x: shape.width / 2, y: shape.height / 2 };
  const relativeP = { x: shape.width * shape.headControl.x, y: shape.height * shape.headControl.y };
  return add(rotate(relativeP, shape.rotation, c), shape.p);
}

export function getTailControlPoint(src: OneSidedArrowShape): IVec2 {
  const shape = getNormalizedSimplePolygonShape(src);
  const c = { x: shape.width / 2, y: shape.height / 2 };
  const relativeP = { x: 0, y: shape.height * shape.tailControl.y };
  return add(rotate(relativeP, shape.rotation, c), shape.p);
}

export function isOneSidedArrowShape(shape: Shape): shape is OneSidedArrowShape {
  return shape.type === "one_sided_arrow";
}
