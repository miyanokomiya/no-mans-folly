import { IVec2, MINVALUE, add, getDistance, getUnit, multi, rotate, sub } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { BezierCurveControl } from "../../models";
import { applyLocalSpace } from "../../utils/renderer";

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

const baseStruct = getStructForSimplePolygon<BubbleShape>(getPath, getCurves);

export const struct: ShapeStruct<BubbleShape> = {
  ...baseStruct,
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
  render(ctx, shape) {
    baseStruct.render(ctx, shape);

    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    applyLocalSpace(ctx, rect, shape.rotation, () => {
      const beakTip = { x: shape.width * shape.beakTipC.x, y: shape.height * shape.beakTipC.y };
      const [p, q] = getBeakRoots(shape);
      ctx.strokeStyle = "green";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(beakTip.x, beakTip.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    });
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
  const { x: rx, y: ry } = getCornerRadius(shape);
  const rate = 0.44772; // Magic value to approximate border-radius via cubic-bezier
  const bx = rx * rate;
  const by = ry * rate;

  return [
    undefined,
    { c1: { x: shape.width - bx, y: 0 }, c2: { x: shape.width, y: by } },
    undefined,
    { c1: { x: shape.width, y: shape.height - by }, c2: { x: shape.width - bx, y: shape.height } },
    undefined,
    { c1: { x: bx, y: shape.height }, c2: { x: 0, y: shape.height - bx } },
    undefined,
    { c1: { x: 0, y: by }, c2: { x: bx, y: 0 } },
  ];
}

function getCornerRadius(shape: BubbleShape): IVec2 {
  return {
    x: shape.width * shape.cornerC?.x,
    y: shape.height * shape.cornerC.y,
  };
}

function getBeakRoots(shape: BubbleShape): [IVec2, IVec2] {
  // const path = getPath(shape);
  // const curves = getCurves(shape);

  const c = { x: shape.width / 2, y: shape.height / 2 };
  const beakTip = { x: shape.width * shape.beakTipC.x, y: shape.height * shape.beakTipC.y };
  const radius = Math.min(shape.width, shape.height) / 4;
  const d = getDistance(beakTip, c);
  if (d <= MINVALUE) return [c, c];

  const r = Math.asin(radius / d);
  const unit = getUnit(sub(c, beakTip));
  const rootD = Math.sqrt(d * d - radius * radius);
  const root0 = add(multi(rotate(unit, r), rootD), beakTip);
  const root1 = add(multi(rotate(unit, -r), rootD), beakTip);
  return [root0, root1];
}
