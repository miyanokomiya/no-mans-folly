import { IVec2, MINVALUE, add, getNorm, getUnit, multi, rotate, sub } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getLocalAbsolutePoint, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle, getStrokeWidth } from "../../utils/strokeStyle";
import { expandRect, extendSegment, getD2, getRotatedWrapperRect, getWrapperRect } from "../../utils/geometry";
import { pickMinItem } from "../../utils/commons";
import { BezierPath, PathLocation, combineBezierPathAndPath, getCrossBezierPathAndSegment } from "../../utils/path";

export type BubbleShape = SimplePolygonShape & {
  /**
   * Relative rate from "p".
   * Represents the tip position of the beak.
   */
  beakTipC: IVec2;
  /**
   * Relative rate from "p".
   * Represents the origin position of the beak.
   */
  beakOriginC: IVec2;
  /**
   * Represents the size (radius of the root arc) of the beak.
   */
  beakSizeRate: number;
  /**
   * Relative rate from "p".
   * Represents the corner radius of top-left one.
   */
  cornerC: IVec2;
};

const baseStruct = getStructForSimplePolygon<BubbleShape>(combineBeakAndOutline, { outlineSnap: "trbl" });

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
      beakOriginC: arg.beakOriginC ?? { x: 0.5, y: 0.5 },
      beakSizeRate: arg.beakSizeRate ?? 0.5,
      cornerC: arg.cornerC ?? { x: 0.2, y: 0.2 },
    };
  },
  getWrapperRect(shape, _, includeBounds) {
    let rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    if (includeBounds) {
      const beakTip = getLocalAbsolutePoint(shape, shape.beakTipC);
      const beakTipRect = { x: shape.p.x + beakTip.x, y: shape.p.y + beakTip.y, width: 0, height: 0 };
      rect = expandRect(getWrapperRect([rect, beakTipRect]), getStrokeWidth(shape.stroke) / 2);
    }
    return getRotatedWrapperRect(rect, shape.rotation);
  },
  getTextRangeRect(shape) {
    const radius = getCornerRadius(shape);
    const r = Math.atan(radius.y / radius.x);
    const rx = (1 - Math.cos(r)) * radius.x;
    const ry = (1 - Math.sin(r)) * radius.y;
    const rect = {
      x: shape.p.x + rx,
      y: shape.p.y + ry,
      width: shape.width - rx * 2,
      height: shape.height - ry * 2,
    };
    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
  canAttachSmartBranch: true,
};

function getPath(shape: BubbleShape): SimplePath {
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
    curves: [
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

function getCornerValue(shape: BubbleShape): IVec2 {
  const { x: rx, y: ry } = getCornerRadius(shape);
  const rate = 0.44772; // Magic value to approximate border-radius via cubic-bezier
  return { x: rx * rate, y: ry * rate };
}

function getCornerRadius(shape: BubbleShape): IVec2 {
  return {
    x: shape.width * shape.cornerC?.x,
    y: shape.height * shape.cornerC.y,
  };
}

export function getBeakSize(shape: BubbleShape): number {
  return getMaxBeakSize(shape) * shape.beakSizeRate;
}

export function getMaxBeakSize(shape: BubbleShape): number {
  // Avoid getting close to the maximam because intersection calculation is a bit of edge sensitive.
  return (Math.min(shape.width, shape.height) / 2) * 0.99;
}

/**
 * Returned roots and the tip always keep the below formation.
 *   sizeControl
 *     |     root0
 *     |           \
 *   origin -------- tip
 *                 /
 *           root1
 */
export function getBeakControls(shape: BubbleShape): {
  tip: IVec2;
  origin: IVec2;
  roots: [root0: IVec2, root1: IVec2];
  sizeControl: IVec2;
} {
  const beakOrigin = getLocalAbsolutePoint(shape, shape.beakOriginC);
  const beakTip = getLocalAbsolutePoint(shape, shape.beakTipC);
  const tipToOrigin = sub(beakOrigin, beakTip);
  const d = getNorm(tipToOrigin);
  if (d <= MINVALUE)
    return { tip: beakTip, origin: beakOrigin, roots: [beakOrigin, beakOrigin], sizeControl: beakOrigin };

  const radius = getBeakSize(shape);
  const sizeControl = add(multi(getUnit(rotate(tipToOrigin, Math.PI / 2)), radius), beakOrigin);
  const r = Math.asin(radius / d);
  const tipToOriginUnit = multi(tipToOrigin, 1 / d);
  const rootD = Math.sqrt(d * d - radius * radius);
  const root0 = add(multi(rotate(tipToOriginUnit, r), rootD), beakTip);
  const root1 = add(multi(rotate(tipToOriginUnit, -r), rootD), beakTip);
  return { tip: beakTip, origin: beakOrigin, roots: [root0, root1], sizeControl };
}

function combineBeakAndOutline(shape: BubbleShape): BezierPath {
  const { path, curves } = getPath(shape);
  const bezierPath = { path, curves: curves ?? [] };
  const { tip: beakTip, roots } = getBeakControls(shape);
  const longSegmentSize = Math.max(shape.width, shape.height);

  const intersections: PathLocation[] = [];

  for (let k = 0; k < roots.length; k++) {
    const root = roots[k];
    // Extending this segment long enough to intersect all candidate segments of the path.
    const beakSeg = extendSegment([beakTip, root], 1 + longSegmentSize);
    const candidates = getCrossBezierPathAndSegment(bezierPath, beakSeg);

    // When the number of candidates is less than 2, the tip is within the shape.
    // => Needless to make a beak.
    if (candidates.length < 2) return bezierPath;
    intersections.push(pickMinItem(candidates, ([p]) => getD2(sub(p, beakTip)))!);
  }

  if (intersections.length < 2) return bezierPath;
  return combineBezierPathAndPath(bezierPath, intersections as [PathLocation, PathLocation], [beakTip]);
}
