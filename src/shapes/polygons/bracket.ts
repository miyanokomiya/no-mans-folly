import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { getBezierControlPaddingForBorderRadius } from "../../utils/geometry";

export type BracketShape = SimplePolygonShape & {
  thickness: number;
  r: number;
};

const baseStruct = getStructForSimplePolygon<BracketShape>(getPath);

export const struct: ShapeStruct<BracketShape> = {
  ...baseStruct,
  label: "Bracket",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "bracket",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 50,
      height: arg.height ?? 100,
      thickness: 10,
      r: 0,
    };
  },
  applyScale(shape, scaleValue) {
    return {
      ...baseStruct.applyScale?.(shape, scaleValue),
      thickness: Math.max(0, shape.thickness * scaleValue.y),
      r: Math.max(0, shape.r * scaleValue.y),
    };
  },
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getPath(shape: BracketShape): SimplePath {
  const w = shape.width;
  const h = shape.height;
  const thickness = getBracketThickness(shape);
  const r = getBracketRadius(shape);
  return getBracketPath(w, h, thickness, r);
}

export function getBracketPath(w: number, h: number, thickness: number, r: number, optimalRadius = false): SimplePath {
  if (!optimalRadius && r === 0) {
    return {
      path: [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: thickness },
        { x: thickness, y: thickness },
        { x: thickness, y: h - thickness },
        { x: w, y: h - thickness },
        { x: w, y: h },
        { x: 0, y: h },
      ],
    };
  }

  const innerRx = Math.min(r, w - thickness);
  const innerRy = r;
  const [innerBx, innerBy] = getBezierControlPaddingForBorderRadius(innerRx, innerRy);
  const outerRx = innerRx + (optimalRadius ? thickness : 0);
  const outerRy = innerRy + (optimalRadius ? thickness : 0);
  const [outerBx, outerBy] = getBezierControlPaddingForBorderRadius(outerRx, outerRy);
  const curvedPath = [
    { x: 0, y: outerRy },
    { x: outerRx, y: 0 },
    { x: w, y: 0 },
    { x: w, y: thickness },
    { x: thickness + innerRx, y: thickness },
    { x: thickness, y: thickness + innerRy },
    { x: thickness, y: h - thickness - innerRy },
    { x: thickness + innerRx, y: h - thickness },
    { x: w, y: h - thickness },
    { x: w, y: h },
    { x: outerRx, y: h },
    { x: 0, y: h - outerRy },
  ];
  return {
    path: curvedPath,
    curves: [
      {
        c1: { x: curvedPath[0].x, y: curvedPath[0].y - outerBy },
        c2: { x: curvedPath[1].x - outerBx, y: curvedPath[1].y },
      },
      undefined,
      undefined,
      undefined,
      {
        c1: { x: curvedPath[4].x - innerBx, y: curvedPath[4].y },
        c2: { x: curvedPath[5].x, y: curvedPath[5].y - innerBy },
      },
      undefined,
      {
        c1: { x: curvedPath[6].x, y: curvedPath[6].y + innerBy },
        c2: { x: curvedPath[7].x - innerBx, y: curvedPath[7].y },
      },
      undefined,
      undefined,
      undefined,
      {
        c1: { x: curvedPath[10].x - outerBx, y: curvedPath[10].y },
        c2: { x: curvedPath[11].x, y: curvedPath[11].y + outerBy },
      },
    ],
  };
}

export function getBracketThickness(shape: BracketShape): number {
  return Math.max(0, Math.min(shape.thickness, shape.width, shape.height / 2));
}

export function getBracketRadius(shape: BracketShape): number {
  const thickness = getBracketThickness(shape);
  return Math.max(0, Math.min(shape.r, shape.height / 2 - thickness));
}
