import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";

export type AngleBracketShape = SimplePolygonShape & {
  thickness: number;
};

const baseStruct = getStructForSimplePolygon<AngleBracketShape>(getPath);

export const struct: ShapeStruct<AngleBracketShape> = {
  ...baseStruct,
  label: "AngleBracket",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "angle_bracket",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 50,
      height: arg.height ?? 100,
      thickness: 10,
    };
  },
  applyScale(shape, scaleValue) {
    return {
      ...baseStruct.applyScale?.(shape, scaleValue),
      thickness: Math.max(0, shape.thickness * scaleValue.y),
    };
  },
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getPath(shape: AngleBracketShape): SimplePath {
  const w = shape.width;
  const h = shape.height;
  const thickness = getAngleBracketThickness(shape);
  return getAngleBracketPath(w, h, thickness);
}

function getAngleBracketPath(w: number, h: number, thickness: number): SimplePath {
  const tan = w !== 0 ? h / 2 / w : 0;
  const beakSize = tan !== 0 ? thickness / tan : 0;
  return {
    path: [
      { x: 0, y: h / 2 },
      { x: w, y: 0 },
      { x: w, y: thickness },
      { x: beakSize, y: h / 2 },
      { x: w, y: h - thickness },
      { x: w, y: h },
      { x: 0, y: h / 2 },
    ],
  };
}

export function getAngleBracketThickness(shape: AngleBracketShape): number {
  return Math.max(0, Math.min(shape.thickness, shape.width, shape.height / 2));
}
