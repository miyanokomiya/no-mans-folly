import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { getQuarticRoots } from "minimatrix-polyroots";
import { CrossShape } from "./cross";

export type DiagonalCrossShape = CrossShape;

export const struct: ShapeStruct<DiagonalCrossShape> = {
  ...getStructForSimplePolygon<DiagonalCrossShape>(getDiagonalCrossPath),
  label: "DiagonalCross",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "diagonal_cross",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      crossSize: arg.crossSize ?? 20,
    };
  },
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

export function getDiagonalCrossPath(shape: DiagonalCrossShape): SimplePath {
  const cx = shape.width / 2;
  const cy = shape.height / 2;

  const size = shape.crossSize;
  if ((size >= shape.width && size >= shape.height) || size <= 0) {
    // Fallback to rectangle when the cross size is too big.
    const tl = { x: 0, y: 0 };
    const tr = { x: shape.width, y: 0 };
    const br = { x: shape.width, y: shape.height };
    const bl = { x: 0, y: shape.height };
    return {
      path: [
        tl,
        tl,
        { x: cx, y: 0 },
        tr,
        tr,
        { x: shape.width, y: cy },
        br,
        br,
        { x: cx, y: shape.height },
        bl,
        bl,
        { x: 0, y: cy },
      ],
    };
  }

  // Ref: https://math.stackexchange.com/questions/4847278/length-of-a-diagonal-rectangle-inside-another-rectangle
  const a4 = shape.height + size;
  const a3 = 2 * shape.width;
  const a2 = -6 * size;
  const a1 = a3;
  const a0 = -shape.height + size;
  const result = getQuarticRoots(a4, a3, a2, a1, a0).filter((v) => v.imag === 0);
  const rlist = result.map((v) => 2 * Math.atan(v.real)).filter((r) => 0 <= r && r <= Math.PI / 2);
  const r = rlist[0] ?? 0;
  const x = Math.min(cx, Math.sin(r) * size);
  const y = Math.min(cy, Math.cos(r) * size);
  const dx = Math.max(0, (cy - y) / Math.tan(r));
  const dy = Math.max(0, (cx - x) * Math.tan(r));

  const x0 = 0;
  const y0 = 0;

  const x1 = x;
  const y1 = y;

  const x2 = dx;
  const y2 = dy;

  const x3 = shape.width - dx;
  const y3 = shape.height - dy;

  const x4 = shape.width - x1;
  const y4 = shape.height - y1;

  const x5 = shape.width;
  const y5 = shape.height;

  return {
    path: [
      { x: x0, y: y1 },
      { x: x1, y: y0 },
      { x: cx, y: y2 },
      { x: x4, y: y0 },
      { x: x5, y: y1 },
      { x: x3, y: cy },
      { x: x5, y: y4 },
      { x: x4, y: y5 },
      { x: cx, y: y3 },
      { x: x1, y: y5 },
      { x: x0, y: y4 },
      { x: x2, y: cy },
    ],
  };
}
