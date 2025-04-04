import { IVec2, clamp } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { getBezierControlPaddingForBorderRadius, getRoundedRectInnerBounds } from "../../utils/geometry";

export type RoundedRectangleShape = SimplePolygonShape & {
  rx: number;
  ry: number;
};

const baseStruct = getStructForSimplePolygon(getPath, { outlineSnap: "trbl" });

export const struct: ShapeStruct<RoundedRectangleShape> = {
  ...baseStruct,
  label: "RoundedRectangle",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "rounded_rectangle",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      rx: arg.rx ?? 10,
      ry: arg.ry ?? 10,
    };
  },
  getTextRangeRect(shape) {
    const radius = getCornerRadius(shape);
    const rect = getRoundedRectInnerBounds(
      {
        x: shape.p.x,
        y: shape.p.y,
        width: shape.width,
        height: shape.height,
      },
      radius.x,
      radius.y,
    );
    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
  applyScale(shape, scaleValue) {
    return {
      ...baseStruct.applyScale?.(shape, scaleValue),
      rx: Math.max(0, shape.rx * scaleValue.x),
      ry: Math.max(0, shape.ry * scaleValue.y),
    };
  },
  canAttachSmartBranch: true,
};

function getPath(shape: RoundedRectangleShape): SimplePath {
  const { x: rx, y: ry } = getCornerRadius(shape);
  const { x: bx, y: by } = getCornerValue(shape);

  return {
    path: [
      { x: rx, y: 0 },
      { x: shape.width - rx, y: 0 },
      { x: shape.width, y: ry },
      { x: shape.width, y: shape.height - ry },
      { x: shape.width - rx, y: shape.height },
      { x: rx, y: shape.height },
      { x: 0, y: shape.height - ry },
      { x: 0, y: ry },
      { x: rx, y: 0 },
    ],
    curves:
      rx === 0 || ry === 0
        ? undefined
        : [
            undefined,
            { c1: { x: shape.width - bx, y: 0 }, c2: { x: shape.width, y: by } },
            undefined,
            { c1: { x: shape.width, y: shape.height - by }, c2: { x: shape.width - bx, y: shape.height } },
            undefined,
            { c1: { x: bx, y: shape.height }, c2: { x: 0, y: shape.height - by } },
            undefined,
            { c1: { x: 0, y: by }, c2: { x: bx, y: 0 } },
          ],
  };
}

function getCornerValue(shape: RoundedRectangleShape): IVec2 {
  const { x: rx, y: ry } = getCornerRadius(shape);
  const [x, y] = getBezierControlPaddingForBorderRadius(rx, ry);
  return { x, y };
}

function getCornerRadius(shape: RoundedRectangleShape): IVec2 {
  return { x: clamp(0, shape.width / 2, shape.rx), y: clamp(0, shape.height / 2, shape.ry) };
}
