import { IRectangle, IVec2, add, sub, rotate } from "okageo";
import { ShapeStruct, createBaseShape } from "./core";
import { SimplePolygonShape, getNormalizedSimplePolygonShape, getStructForSimplePolygon } from "./simplePolygon";
import { createBoxPadding, getPaddingRect } from "../utils/boxPadding";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { Shape } from "../models";
import { getRotateFn } from "../utils/geometry";

/**
 * Suppose the heads face horizontally.
 */
export type TwoSidedArrowShape = SimplePolygonShape & {
  /**
   * Represents the rate from the arrow top to top center of the shape.
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
      headControl: arg.headControl ?? { x: 0.5, y: 0.5 },
      direction: arg.direction ?? 1,
    };
  },
  getTextRangeRect(shape) {
    const halfWidth = shape.width / 2;
    const halfHeight = shape.height / 2;
    let rect: IRectangle;

    if (shape.direction === 0) {
      const headDepth = halfWidth * (1 - shape.headControl.y);
      const headLength = halfHeight * shape.headControl.x;
      const bodyHeight = shape.width - headDepth * 2;
      const headPadding = (bodyHeight / 2) * (headLength / halfWidth);
      rect = {
        x: shape.p.x + headDepth,
        y: shape.p.y + headPadding,
        width: bodyHeight,
        height: shape.height - headPadding * 2,
      };
    } else {
      const headDepth = halfHeight * (1 - shape.headControl.y);
      const headLength = halfWidth * shape.headControl.x;
      const bodyHeight = shape.height - headDepth * 2;
      const headPadding = (bodyHeight / 2) * (headLength / halfHeight);
      rect = {
        x: shape.p.x + headPadding,
        y: shape.p.y + headDepth,
        width: shape.width - headPadding * 2,
        height: bodyHeight,
      };
    }

    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
};

function getPath(src: TwoSidedArrowShape): IVec2[] {
  const shape = getNormalizedSimplePolygonShape(src);
  const halfWidth = shape.width / 2;
  const halfHeight = shape.height / 2;
  const c = { x: shape.p.x + halfWidth, y: shape.p.y + halfHeight };

  const headDepth = halfHeight * (1 - shape.headControl.y);
  const headLength = halfWidth * shape.headControl.x;
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
  return path.map((p) => sub(rotateFn(p), src.p));
}

export function getHeadControlPoint(src: TwoSidedArrowShape): IVec2 {
  const shape = getNormalizedSimplePolygonShape(src);
  const c = { x: shape.width / 2, y: shape.height / 2 };
  const from = { x: shape.width, y: c.y };
  const v = { x: -shape.width / 2, y: -c.y };
  const relativeP = add({ x: v.x * shape.headControl.x, y: v.y * shape.headControl.y }, from);
  return add(rotate(relativeP, shape.rotation, c), shape.p);
}

export function isTwoSidedArrowShape(shape: Shape): shape is TwoSidedArrowShape {
  return shape.type === "two_sided_arrow";
}
