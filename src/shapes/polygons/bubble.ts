import {
  IVec2,
  MINVALUE,
  add,
  divideBezier3,
  getCrossSegAndBezier3WithT,
  getDistance,
  getUnit,
  multi,
  rotate,
  sub,
} from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePolygonShape, getLocalAbsolutePoint, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { BezierCurveControl } from "../../models";
import { ISegment, extendSegment, getCrossSegAndSeg, getD2 } from "../../utils/geometry";
import { pickMinItem } from "../../utils/commons";

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

const baseStruct = getStructForSimplePolygon<BubbleShape>(
  (s) => combineBeakAndOutline(s).path,
  (s) => combineBeakAndOutline(s).curves,
);

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

function getCornerValue(shape: BubbleShape): IVec2 {
  const { x: rx, y: ry } = getCornerRadius(shape);
  const rate = 0.44772; // Magic value to approximate border-radius via cubic-bezier
  return { x: rx * rate, y: ry * rate };
}

function getCurves(shape: BubbleShape): (BezierCurveControl | undefined)[] {
  const { x: bx, y: by } = getCornerValue(shape);
  return [
    undefined,
    { c1: { x: shape.width - bx, y: 0 }, c2: { x: shape.width, y: by } },
    undefined,
    { c1: { x: shape.width, y: shape.height - by }, c2: { x: shape.width - bx, y: shape.height } },
    undefined,
    { c1: { x: bx, y: shape.height }, c2: { x: 0, y: shape.height - by } },
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

export function getBeakSize(shape: BubbleShape): number {
  return getMaxBeakSize(shape) * shape.beakSizeRate;
}

export function getMaxBeakSize(shape: BubbleShape): number {
  // Avoid getting close to the maximam because intersection calculation is a bit of edge sensitive.
  return (Math.min(shape.width, shape.height) / 2) * 0.99;
}

/**
 * Returned roots and the tip always keep the below formation.
 *   root0
 *          \
 *            tip
 *          /
 *   root1
 */
export function getBeakControls(shape: BubbleShape): { tip: IVec2; origin: IVec2; roots: [IVec2, IVec2] } {
  const beakOrigin = getLocalAbsolutePoint(shape, shape.beakOriginC);
  const beakTip = getLocalAbsolutePoint(shape, shape.beakTipC);
  const radius = getBeakSize(shape);
  const d = getDistance(beakTip, beakOrigin);
  if (d <= MINVALUE) return { tip: beakTip, origin: beakOrigin, roots: [beakOrigin, beakOrigin] };

  const r = Math.asin(radius / d);
  const unit = getUnit(sub(beakOrigin, beakTip));
  const rootD = Math.sqrt(d * d - radius * radius);
  const root0 = add(multi(rotate(unit, r), rootD), beakTip);
  const root1 = add(multi(rotate(unit, -r), rootD), beakTip);
  return { tip: beakTip, origin: beakOrigin, roots: [root0, root1] };
}

function combineBeakAndOutline(shape: BubbleShape): { path: IVec2[]; curves: (BezierCurveControl | undefined)[] } {
  const path = getPath(shape);
  const curves = getCurves(shape);
  const { tip: beakTip, roots } = getBeakControls(shape);

  type Cross = [IVec2, index0: number, t?: number];
  let cross0: Cross | undefined;
  let cross1: Cross | undefined;

  roots.forEach((root) => {
    // Extending this segment is harmless and allows more flexible intersections.
    const beakSeg = extendSegment([beakTip, root], 2);
    const candidates: [IVec2, index0: number, t?: number][] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const seg: ISegment = [path[i], path[i + 1]];
      const c = curves[i];
      if (c) {
        candidates.push(
          ...getCrossSegAndBezier3WithT(beakSeg, [seg[0], c.c1, c.c2, seg[1]]).map<[IVec2, number, number]>(
            ([p, t]) => [p, i, t],
          ),
        );
      } else {
        const cross = getCrossSegAndSeg(beakSeg, seg);
        if (cross) candidates.push([cross, i]);
      }
    }

    const closestCross = pickMinItem(candidates, ([p]) => getD2(sub(p, beakTip)));
    if (closestCross) {
      if (!cross0) {
        cross0 = closestCross;
      } else {
        cross1 = closestCross;
      }
    }
  });

  if (!cross0 || !cross1) return { path, curves };

  const ret: { path: IVec2[]; curves: (BezierCurveControl | undefined)[] } = { path: [], curves: [] };

  if (cross0[1] === cross1[1]) {
    // When both intersections are on the same segment
    for (let i = 0; i < path.length - 1; i++) {
      const p = path[i];
      const q = path[i + 1];
      const c = curves[i];

      ret.path.push(p);

      if (i === cross0[1]) {
        if (c && cross0[2] !== undefined && cross1[2] !== undefined) {
          const [b0] = divideBezier3([p, c.c1, c.c2, q], cross0[2]);
          ret.curves.push({ c1: b0[1], c2: b0[2] });
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          ret.path.push(beakTip);
          ret.curves.push(undefined);

          const [, d1] = divideBezier3([p, c.c1, c.c2, q], cross1[2]);
          ret.path.push(cross1[0]);
          ret.curves.push({ c1: d1[1], c2: d1[2] });
        } else {
          ret.curves.push(undefined);
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          ret.path.push(beakTip);
          ret.curves.push(undefined);
          ret.path.push(cross1[0]);
          ret.curves.push(undefined);
        }
      } else {
        ret.curves.push(c);
      }

      if (i === path.length - 2) {
        ret.path.push(q);
      }
    }
  } else {
    // When each intersection is on the deferrent segment
    let insideBeak = false;

    // New path may have extra redundant point.
    // => FIXME: This is because of technical reason for redarding intersections over segments.
    for (let i = 0; i < path.length; i++) {
      const adjustedIndex = i + cross0[1];
      const realIndex = adjustedIndex % path.length;
      const realNextIndex = (adjustedIndex + 1) % path.length;
      const p = path[realIndex];
      const q = path[realNextIndex];
      const c = curves[realIndex];

      if (realIndex === cross0[1]) {
        ret.path.push(p);
        if (c && cross0[2] !== undefined) {
          const [b0] = divideBezier3([p, c.c1, c.c2, q], cross0[2]);
          ret.curves.push({ c1: b0[1], c2: b0[2] });
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          ret.path.push(beakTip);
          ret.curves.push(undefined);
        } else {
          ret.curves.push(undefined);
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          ret.path.push(beakTip);
          ret.curves.push(undefined);
        }
        insideBeak = true;
      } else if (realIndex === cross1[1]) {
        ret.path.push(cross1[0]);

        if (c && cross1[2] !== undefined) {
          const [, d1] = divideBezier3([p, c.c1, c.c2, q], cross1[2]);
          ret.curves.push({ c1: d1[1], c2: d1[2] });
        } else {
          ret.curves.push(undefined);
        }
        insideBeak = false;
      } else if (insideBeak) {
        // Skip segments covered by beak.
      } else {
        ret.path.push(p);
        ret.curves.push(c);
      }

      if (i === path.length - 1) {
        ret.path.push(q);
      }
    }
  }

  return ret;
}
