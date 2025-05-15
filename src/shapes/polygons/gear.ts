import { IVec2, clamp, multiAffines, rotate } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import {
  SimplePath,
  SimplePolygonShape,
  getDirectionalSimplePath,
  getSimpleShapeTextRangeRect,
  getStructForSimplePolygon,
} from "../simplePolygon";
import { createBoxPadding } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { TAU } from "../../utils/geometry";
import { convertLinePathToSimplePath, transformBezierPath } from "../../utils/path";

export type GearShape = SimplePolygonShape & {
  /**
   * Represents radius of the inner circle
   */
  c0: IVec2;
  /**
   * The number of teeth
   */
  size: number;
  topRate: number;
  bottomRate: number;
  /**
   * undefined, 0: rounded, 1: straight
   */
  cogType?: 0 | 1;
};

export const struct: ShapeStruct<GearShape> = {
  ...getStructForSimplePolygon<GearShape>(getPath),
  label: "Gear",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "gear",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 0.5, y: 0.1 },
      size: arg.size ?? 8,
      topRate: arg.topRate ?? 0.3,
      bottomRate: arg.bottomRate ?? 0.6,
      cogType: arg.cogType,
      direction: arg.direction,
    };
  },
  getTextRangeRect(shape) {
    return getSimpleShapeTextRangeRect(shape, (s) => {
      // Get inscribed rectangle of the inner ellipse.
      const c = { x: s.width / 2, y: s.height / 2 };
      const r = Math.PI / 4;
      const rate = getInnerRadiusRate(s);
      const dx = Math.cos(r) * s.width * rate;
      const dy = Math.sin(r) * s.height * rate;

      return {
        x: c.x - dx + s.p.x,
        y: c.y - dy + s.p.y,
        width: dx * 2,
        height: dy * 2,
      };
    });
  },
  canAttachSmartBranch: true,
};

function getInnerRadiusRate(src: GearShape): number {
  return clamp(0, 0.5, 0.5 - src.c0.y);
}

function getSize(src: GearShape): number {
  return clamp(3, getMaxGearSize(), src.size);
}

export function getMaxGearSize(): number {
  // There's no technical restriction, but it's better to set reasonal or practical maximum.
  return 64;
}

function getPath(src: GearShape): SimplePath {
  return getDirectionalSimplePath(src, getRawGearPath);
}

export function getRawGearPath(shape: GearShape): SimplePath {
  const size = getSize(shape);
  const width = shape.width;
  const outerRadius = width / 2;
  const innerRadiusRate = getInnerRadiusRate(shape);
  const innerRadius = width * innerRadiusRate;
  const unitR = TAU / size;

  const firstTooth = getFirstToothPoints(outerRadius, innerRadius, size, shape.topRate, shape.bottomRate);
  const points = [...firstTooth];

  for (let i = 1; i < size; i++) {
    firstTooth.forEach((p) => {
      points.push(rotate(p, unitR * i));
    });
  }

  const curves = [];
  if (!shape.cogType) {
    const d = outerRadius - firstTooth[0].x;
    for (let i = 0; i < points.length; i += 4) {
      if (0 < shape.topRate) {
        curves.push({ d: { x: 0.5, y: -d } });
      } else {
        curves.push(undefined);
      }
      curves.push(undefined);
      if (shape.bottomRate < 1) {
        curves.push({ d: { x: 0.5, y: d } });
      } else {
        curves.push(undefined);
      }
      curves.push(undefined);
    }
  }

  const rawPath = convertLinePathToSimplePath(points, curves);

  const aspect = shape.height / width;
  const affine = multiAffines([
    [1, 0, 0, aspect, 0, 0],
    [1, 0, 0, 1, outerRadius, outerRadius],
    [Math.cos(-Math.PI / 2), Math.sin(-Math.PI / 2), -Math.sin(-Math.PI / 2), Math.cos(-Math.PI / 2), 0, 0],
  ]);
  return transformBezierPath(rawPath, affine);
}

/**
 * Default values of "topToothWidthRatio" and "baseToothWidthRatio" are practical ones without any optimization.
 */
function getFirstToothPoints(
  outerRadius: number,
  innerRadius: number,
  numTeeth: number,
  topToothWidthRatio = 1 / 3,
  baseToothWidthRatio = 0.6,
): [IVec2, IVec2, IVec2, IVec2] {
  const anglePerTooth = (2 * Math.PI) / numTeeth;
  const halfAngleTop = (topToothWidthRatio * anglePerTooth) / 2;
  const halfAngleBase = (baseToothWidthRatio * anglePerTooth) / 2;

  // Points on the outer radius (top of the trapezoid)
  const outerPoint1X = outerRadius * Math.cos(-halfAngleTop);
  const outerPoint1Y = outerRadius * Math.sin(-halfAngleTop);

  const outerPoint2X = outerRadius * Math.cos(halfAngleTop);
  const outerPoint2Y = outerRadius * Math.sin(halfAngleTop);

  // Points on the inner radius (base of the trapezoid)
  const innerPoint1X = innerRadius * Math.cos(halfAngleBase);
  const innerPoint1Y = innerRadius * Math.sin(halfAngleBase);

  const innerPoint2X = innerRadius * Math.cos(-halfAngleBase + anglePerTooth);
  const innerPoint2Y = innerRadius * Math.sin(-halfAngleBase + anglePerTooth);

  return [
    { x: outerPoint1X, y: outerPoint1Y },
    { x: outerPoint2X, y: outerPoint2Y },
    { x: innerPoint1X, y: innerPoint1Y },
    { x: innerPoint2X, y: innerPoint2Y },
  ];
}
