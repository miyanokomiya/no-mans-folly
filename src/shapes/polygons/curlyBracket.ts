import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { flipBezierPathV, reverseBezierPath } from "../../utils/path";
import { clamp } from "okageo";

export type CurlyBracketShape = SimplePolygonShape & {
  thickness: number;
};

export const struct: ShapeStruct<CurlyBracketShape> = {
  ...getStructForSimplePolygon<CurlyBracketShape>(getPath),
  label: "CurlyBracket",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "curly_bracket",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 50,
      height: arg.height ?? 100,
      thickness: 5,
    };
  },
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getPath(shape: CurlyBracketShape): SimplePath {
  const w = shape.width;
  const h = shape.height;
  const cy = h / 2;
  const thickness = getBracketThickness(shape);
  const x1 = 0.2 * w;
  const y1 = 0.1 * h;
  const x2 = 0.1 * w;
  const y2 = 0.3 * h;
  const x3 = x2;
  const y3 = 0.4 * h;

  const cx1 = 0.5 * w;
  const cx2 = 0.3 * w;
  const cy2 = 0.05 * h;
  const cx3 = x2;
  const cy3 = 0.15 * h;
  const cx4 = x3;
  const cy4 = 0.25 * h;

  const outerBeak = { x: 0, y: cy };
  const innerBeak = { x: x3 + thickness * 0.75, y: cy };

  const outerTopPath = {
    path: [
      { x: w, y: 0 },
      { x: x1, y: y1 },
      { x: x2, y: y2 },
      { x: x3, y: y3 },
    ],
    curves: [
      { c1: { x: cx1, y: 0 }, c2: { x: cx2, y: cy2 } },
      { c1: { x: cx3, y: cy3 }, c2: { x: cx4, y: cy4 } },
      { c1: { x: x2, y: y2 }, c2: { x: x3, y: y3 } },
      { c1: { x: cx4, y: cy }, c2: outerBeak },
    ],
  };
  const outerBottomPath = reverseBezierPath(flipBezierPathV(outerTopPath, cy));

  const iy0 = thickness;
  const iy1 = Math.max(y1 + thickness * 0.6, iy0);
  const iy2 = Math.max(y2, iy1);
  const iy3 = Math.max(y3, iy2);
  const icy0 = thickness;
  const icy1 = Math.max(cy2 + thickness * 0.6, iy0);
  const icy2 = clamp(iy1, iy2, cy3 + thickness * 0.6);
  const icy3 = clamp(icy2, iy2, cy4);
  const innerTopPath = reverseBezierPath({
    path: [
      { x: w, y: iy0 },
      { x: x1 + thickness, y: iy1 },
      { x: x2 + thickness, y: iy2 },
      { x: x3 + thickness, y: iy3 },
    ],
    curves: [
      { c1: { x: cx1 + thickness * 0.6, y: icy0 }, c2: { x: cx2 + thickness, y: icy1 } },
      { c1: { x: cx3 + thickness, y: icy2 }, c2: { x: cx4 + thickness, y: icy3 } },
      { c1: { x: x2 + thickness, y: iy2 }, c2: { x: x3 + thickness, y: iy3 } },
      { c1: { x: cx4 + thickness, y: cy }, c2: innerBeak },
    ],
  });
  const innerBottomPath = reverseBezierPath(flipBezierPathV(innerTopPath, cy));

  return {
    path: [
      ...outerTopPath.path,
      outerBeak,
      ...outerBottomPath.path,
      ...innerBottomPath.path,
      innerBeak,
      ...innerTopPath.path,
    ],
    curves: [
      ...outerTopPath.curves,
      ...outerBottomPath.curves,
      undefined,
      ...innerBottomPath.curves,
      ...innerTopPath.curves,
    ],
  };
}

export function getBracketThickness(shape: CurlyBracketShape): number {
  return Math.max(0, Math.min(shape.thickness, shape.width / 2, shape.height / 2));
}
