import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";

export type CrossShape = SimplePolygonShape & {
  crossSize: number;
};

const baseStruct = getStructForSimplePolygon<CrossShape>(getPath);

export const struct: ShapeStruct<CrossShape> = {
  ...baseStruct,
  label: "Cross",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "cross",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      crossSize: arg.crossSize ?? 20,
    };
  },
  applyScale(shape, scaleValue) {
    return {
      ...baseStruct.applyScale?.(shape, scaleValue),
      crossSize: Math.max(0, shape.crossSize * Math.min(scaleValue.x, scaleValue.y)),
    };
  },
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getPath(shape: CrossShape): SimplePath {
  const cx = shape.width / 2;
  const cy = shape.height / 2;

  const size = shape.crossSize;
  if (size >= shape.width || size >= shape.height || size <= 0) {
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

  const d = size / 2;

  const x0 = 0;
  const y0 = 0;

  const x1 = cx - d;
  const y1 = cy - d;

  const x2 = cx + d;
  const y2 = cy + d;

  const x3 = shape.width;
  const y3 = shape.height;

  return {
    path: [
      { x: x0, y: y1 },
      { x: x1, y: y1 },
      { x: x1, y: y0 },
      { x: x2, y: y0 },
      { x: x2, y: y1 },
      { x: x3, y: y1 },
      { x: x3, y: y2 },
      { x: x2, y: y2 },
      { x: x2, y: y3 },
      { x: x1, y: y3 },
      { x: x1, y: y2 },
      { x: x0, y: y2 },
    ],
  };
}
