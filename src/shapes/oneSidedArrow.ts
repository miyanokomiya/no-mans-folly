import { IRectangle, IVec2, add, multi, rotate } from "okageo";
import { ShapeStruct, createBaseShape } from "./core";
import { SimplePolygonShape, getStructForSimplePolygon } from "./simplePolygon";
import { createBoxPadding, getPaddingRect } from "../utils/boxPadding";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { Direction4 } from "../models";
import { getRotateFn } from "../utils/geometry";

/**
 * Suppose the head faces toward right by default.
 * => "width" represents length of the arrow.
 */
export type OneSidedArrowShape = SimplePolygonShape & {
  /**
   * Represents the rate from the arrow top to top left of the shape.
   * - The bigger x, the bigger length of the head.
   * - The bigger y, the smaller depth of the head.
   */
  headControl: IVec2;
  /**
   * Represents the rate from the opposite of the arrow top to top left of the body.
   * - x has no role.
   * - The smaller y, the skewer the tail of the arrow.
   */
  tailControl: IVec2;
  direction?: Direction4; // "undefined" should mean "1"
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
      headControl: arg.headControl ?? { x: 0.25, y: 0.5 },
      tailControl: arg.tailControl ?? { x: 0, y: 1 },
      direction: arg.direction ?? 1,
    };
  },
  getTextRangeRect(shape) {
    const halfWidth = shape.width / 2;
    const halfHeight = shape.height / 2;
    let rect: IRectangle;

    if (shape.direction === 0 || shape.direction === 2) {
      const headDepth = halfWidth * (1 - shape.headControl.y);
      const headLength = shape.height * shape.headControl.x;
      const bodyHeight = shape.width - headDepth * 2;
      const headPadding = (bodyHeight / 2) * (headLength / halfWidth);
      rect = {
        x: shape.p.x + headDepth,
        y: shape.direction === 0 ? shape.p.y + headPadding : shape.p.y,
        width: bodyHeight,
        height: shape.height - headPadding,
      };
    } else {
      const headDepth = halfHeight * (1 - shape.headControl.y);
      const headLength = shape.width * shape.headControl.x;
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

export function getNormalizedArrowShape(shape: OneSidedArrowShape): OneSidedArrowShape {
  switch (shape.direction) {
    case 0:
      return {
        ...shape,
        ...getNormalizedAttrsForVertical(shape),
        rotation: shape.rotation - Math.PI / 2,
      };
    case 2:
      return {
        ...shape,
        ...getNormalizedAttrsForVertical(shape),
        rotation: shape.rotation + Math.PI / 2,
      };
    case 3:
      return { ...shape, rotation: shape.rotation + Math.PI, direction: 1 };
    default:
      return shape;
  }
}

function getNormalizedAttrsForVertical(shape: OneSidedArrowShape): Partial<OneSidedArrowShape> {
  return {
    p: rotate({ x: shape.p.x, y: shape.p.y + shape.height }, Math.PI / 2, {
      x: shape.p.x + shape.width / 2,
      y: shape.p.y + shape.height / 2,
    }),
    width: shape.height,
    height: shape.width,
    direction: 1,
  };
}

function getPath(src: OneSidedArrowShape): IVec2[] {
  const shape = getNormalizedArrowShape(src);
  const halfWidth = shape.width / 2;
  const halfHeight = shape.height / 2;
  const c = { x: shape.p.x + halfWidth, y: shape.p.y + halfHeight };

  const headDepth = halfHeight * (1 - shape.headControl.y);
  const headLength = shape.width * shape.headControl.x;
  const bodyHeight = shape.height - headDepth * 2;
  const tailHeight = bodyHeight * shape.tailControl.y;
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
  const rotateFn = getRotateFn(shape.rotation, c);
  return path.map((p) => rotateFn(p));
}

export function getHeadControlPoint(src: OneSidedArrowShape): IVec2 {
  const shape = getNormalizedArrowShape(src);
  const c = { x: shape.width / 2, y: shape.height / 2 };
  const from = { x: shape.width, y: c.y };
  const v = multi(from, -1);
  const relativeP = add({ x: v.x * shape.headControl.x, y: v.y * shape.headControl.y }, from);
  return add(rotate(relativeP, shape.rotation, c), shape.p);
}

export function getTailControlPoint(src: OneSidedArrowShape): IVec2 {
  const shape = getNormalizedArrowShape(src);
  const c = { x: shape.width / 2, y: shape.height / 2 };
  const headDepth = c.y * (1 - shape.headControl.y);
  const from = { x: 0, y: c.y };
  const v = { x: 0, y: headDepth - from.y };
  const relativeP = add({ x: 0, y: v.y * shape.tailControl.y }, from);
  return add(rotate(relativeP, shape.rotation, c), shape.p);
}

export function getHeadPoint(src: OneSidedArrowShape): IVec2 {
  const shape = getNormalizedArrowShape(src);
  const c = { x: shape.width, y: shape.height / 2 };
  return add(rotate({ x: shape.width, y: c.y }, shape.rotation, c), shape.p);
}

export function getArrowDirection(shape: OneSidedArrowShape): Direction4 {
  return shape.direction ?? 1;
}
