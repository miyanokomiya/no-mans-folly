import { IVec2, add, multi, rotate } from "okageo";
import { ShapeStruct, createBaseShape } from "./core";
import { SimplePolygonShape, getStructForSimplePolygon } from "./simplePolygon";
import { createBoxPadding, getPaddingRect } from "../utils/boxPadding";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";

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
      tailControl: arg.tailControl ?? { x: 1, y: 1 },
    };
  },
  getTextRangeRect(shape) {
    const halfHeight = shape.height / 2;
    const headDepth = halfHeight * (1 - shape.headControl.y);
    const headLength = shape.width * shape.headControl.x;
    const bodyHeight = shape.height - headDepth * 2;
    const rect = {
      x: shape.p.x,
      y: shape.p.y + headDepth,
      width: shape.width - (bodyHeight / 2) * (headLength / halfHeight),
      height: bodyHeight,
    };
    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
};

function getPath(shape: OneSidedArrowShape): IVec2[] {
  const halfHeight = shape.height / 2;
  const headDepth = halfHeight * (1 - shape.headControl.y);
  const headLength = shape.width * shape.headControl.x;
  const bodyHeight = shape.height - headDepth * 2;
  const tailHeight = bodyHeight * shape.tailControl.y;
  const halfTailHeight = tailHeight / 2;
  return [
    { x: shape.p.x, y: shape.p.y + halfHeight - halfTailHeight },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y + headDepth },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y },
    { x: shape.p.x + shape.width, y: shape.p.y + halfHeight },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y + shape.height },
    { x: shape.p.x + shape.width - headLength, y: shape.p.y + shape.height - headDepth },
    { x: shape.p.x, y: shape.p.y + halfHeight + halfTailHeight },
  ];
}

export function getHeadControlPoint(shape: OneSidedArrowShape): IVec2 {
  const from = { x: shape.width, y: shape.height / 2 };
  const v = multi(from, -1);
  const relativeP = add({ x: v.x * shape.headControl.x, y: v.y * shape.headControl.y }, from);
  return add(rotate(relativeP, shape.rotation, { x: shape.width / 2, y: shape.height / 2 }), shape.p);
}

export function getTailControlPoint(shape: OneSidedArrowShape): IVec2 {
  const headDepth = (shape.height / 2) * (1 - shape.headControl.y);
  const from = { x: 0, y: shape.height / 2 };
  const v = { x: 0, y: headDepth - from.y };
  const relativeP = add({ x: 0, y: v.y * shape.tailControl.y }, from);
  return add(rotate(relativeP, shape.rotation, { x: shape.width / 2, y: shape.height / 2 }), shape.p);
}
