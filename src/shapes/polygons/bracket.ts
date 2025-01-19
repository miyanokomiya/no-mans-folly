import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { getBezierControlPaddingForBorderRadius } from "../../utils/geometry";

export type BracketShape = SimplePolygonShape & {
  thickness: number;
  r: number;
};

export const struct: ShapeStruct<BracketShape> = {
  ...getStructForSimplePolygon<BracketShape>(getPath),
  label: "Bracket",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "bracket",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 50,
      height: arg.height ?? 100,
      thickness: 5,
      r: 0,
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

  if (r === 0) {
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

  const [b] = getBezierControlPaddingForBorderRadius(r, r);
  const curvedPath = [
    { x: 0, y: r },
    { x: r, y: 0 },
    { x: w, y: 0 },
    { x: w, y: thickness },
    { x: thickness + r, y: thickness },
    { x: thickness, y: thickness + r },
    { x: thickness, y: h - thickness - r },
    { x: thickness + r, y: h - thickness },
    { x: w, y: h - thickness },
    { x: w, y: h },
    { x: r, y: h },
    { x: 0, y: h - r },
  ];
  return {
    path: curvedPath,
    curves: [
      { c1: { x: curvedPath[0].x, y: curvedPath[0].y - b }, c2: { x: curvedPath[1].x - b, y: curvedPath[1].y } },
      undefined,
      undefined,
      undefined,
      { c1: { x: curvedPath[4].x - b, y: curvedPath[4].y }, c2: { x: curvedPath[5].x, y: curvedPath[5].y - b } },
      undefined,
      { c1: { x: curvedPath[6].x, y: curvedPath[6].y + b }, c2: { x: curvedPath[7].x - b, y: curvedPath[7].y } },
      undefined,
      undefined,
      undefined,
      { c1: { x: curvedPath[10].x - b, y: curvedPath[10].y }, c2: { x: curvedPath[11].x, y: curvedPath[11].y + b } },
    ],
  };
}

export function getBracketThickness(shape: BracketShape): number {
  return Math.max(0, Math.min(shape.thickness, shape.width / 2, shape.height / 2));
}

export function getBracketRadius(shape: BracketShape): number {
  return Math.max(0, Math.min(shape.r, shape.width / 2, shape.height / 2));
}
