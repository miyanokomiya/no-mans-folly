import { IVec2 } from "okageo";
import { ShapeStruct } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";
import { getStructForSimplePolygon } from "./simplePolygon";
import { getPaddingRect } from "../utils/boxPadding";

type RhombusShape = RectangleShape;

export const struct: ShapeStruct<RhombusShape> = {
  ...recntagleStruct,
  ...getStructForSimplePolygon<RhombusShape>(getPath),
  label: "Rhombus",
  create(arg = {}) {
    return {
      ...recntagleStruct.create(arg),
      type: "rhombus",
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
};

function getPath(shape: RhombusShape): IVec2[] {
  const halfW = shape.width / 2;
  const halfH = shape.height / 2;
  return [
    { x: shape.p.x + halfW, y: shape.p.y },
    { x: shape.p.x + shape.width, y: shape.p.y + halfH },
    { x: shape.p.x + halfW, y: shape.p.y + shape.height },
    { x: shape.p.x, y: shape.p.y + halfH },
  ];
}
