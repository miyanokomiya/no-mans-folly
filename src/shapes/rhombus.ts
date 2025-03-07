import { ShapeStruct, createBaseShape } from "./core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "./simplePolygon";
import { createBoxPadding, getPaddingRect } from "../utils/boxPadding";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";

type RhombusShape = SimplePolygonShape;

export const struct: ShapeStruct<RhombusShape> = {
  ...getStructForSimplePolygon<RhombusShape>(getPath),
  label: "Rhombus",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "rhombus",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
    };
  },
  getTextRangeRect(shape) {
    const rect = {
      x: shape.p.x + shape.width / 4,
      y: shape.p.y + shape.height / 4,
      width: shape.width / 2,
      height: shape.height / 2,
    };
    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
  canAttachSmartBranch: true,
};

function getPath(shape: RhombusShape): SimplePath {
  const halfW = shape.width / 2;
  const halfH = shape.height / 2;
  return {
    path: [
      { x: halfW, y: 0 },
      { x: shape.width, y: halfH },
      { x: halfW, y: shape.height },
      { x: 0, y: halfH },
    ],
  };
}
