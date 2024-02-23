import { IVec2 } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { BezierCurveControl } from "../../models";

export type BubbleShape = SimplePolygonShape & {
  /**
   * Relative rate from "p".
   * The tip position of the beak.
   */
  beakTipC: IVec2;
  /**
   * Relative rate from "p".
   * For corner radius.
   */
  cornerC: IVec2;
};

export const struct: ShapeStruct<BubbleShape> = {
  ...getStructForSimplePolygon<BubbleShape>(getPath, getCurves),
  label: "Bubble",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "bubble",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      beakTipC: arg.beakTipC ?? { x: 0.3, y: 1.2 },
      cornerC: arg.cornerC ?? { x: 0.1, y: 0.1 },
    };
  },
  getTextRangeRect(shape) {
    const { x: rx, y: ry } = getCornerRadius(shape);
    const rect = {
      x: shape.p.x + rx / 2,
      y: shape.p.y + ry / 2,
      width: shape.width - rx,
      height: shape.height - ry,
    };
    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
  canAttachSmartBranch: true,
};

function getPath(shape: BubbleShape): IVec2[] {
  const { x: rx, y: ry } = getCornerRadius(shape);

  return [
    { x: rx, y: 0 },
    { x: shape.width - rx, y: 0 },
    { x: shape.width, y: ry },
    { x: shape.width, y: shape.height - ry },
    { x: shape.width - rx, y: shape.height },
    { x: rx, y: shape.height },
    { x: 0, y: shape.height - ry },
    { x: 0, y: ry },
    { x: rx, y: 0 },
  ];
}

function getCurves(shape: BubbleShape): (BezierCurveControl | undefined)[] {
  return [
    undefined,
    { c1: { x: shape.width, y: 0 }, c2: { x: shape.width, y: 0 } },
    undefined,
    { c1: { x: shape.width, y: shape.height }, c2: { x: shape.width, y: shape.height } },
    undefined,
    { c1: { x: 0, y: shape.height }, c2: { x: 0, y: shape.height } },
    undefined,
    { c1: { x: 0, y: 0 }, c2: { x: 0, y: 0 } },
  ];
}

function getCornerRadius(shape: BubbleShape): IVec2 {
  return {
    x: shape.width * shape.cornerC?.x,
    y: shape.height * shape.cornerC.y,
  };
}
