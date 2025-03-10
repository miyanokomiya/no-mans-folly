import { IVec2, clamp, getNorm, getRadian } from "okageo";
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
import { getCrossLineAndLine, getRotateFn } from "../../utils/geometry";

export type StarShape = SimplePolygonShape & {
  /**
   * The point of this rate aren't always on the inner perimeter
   * because the center of inner circule can move when the size is odd number.
   */
  c0: IVec2;
  size: number;
  /**
   * undefined, 0: fulfilled within the bounds
   * 1: regular polygon within the bounds
   */
  sizeType?: 0 | 1;
};

export const struct: ShapeStruct<StarShape> = {
  ...getStructForSimplePolygon<StarShape>(getPath),
  label: "Star",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "star",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 0.5, y: 0.25 },
      size: arg.size ?? 5,
      sizeType: arg.sizeType,
      direction: arg.direction,
    };
  },
  getTextRangeRect(shape) {
    return getSimpleShapeTextRangeRect(shape, (s) => {
      // Get inscribed rectangle of the inner ellipse.
      const c = { x: s.width / 2, y: s.height / 2 };
      const r = Math.PI / 4;
      const rate = getRadiusRate(s);
      const gapRate = getSizeGapScale(s);
      const dx = Math.cos(r) * s.width * rate * gapRate.x;
      const dy = Math.sin(r) * s.height * rate * gapRate.y;

      return {
        x: c.x - dx + s.p.x,
        y: c.y * gapRate.y - dy + s.p.y,
        width: dx * 2,
        height: dy * 2,
      };
    });
  },
  canAttachSmartBranch: true,
};

function getRadiusRate(src: StarShape): number {
  return clamp(0, 0.5, 0.5 - src.c0.y);
}

function getSize(src: StarShape): number {
  return clamp(3, getMaxStarSize(), src.size);
}

export function getMaxStarSize(): number {
  // There's no technical restriction, but it's better to set reasonal or practical maximum.
  return 64;
}

function getPath(src: StarShape): SimplePath {
  return getDirectionalSimplePath(src, getRawStarPath);
}

export function getRawStarPath(shape: StarShape): SimplePath {
  const size = getSize(shape);
  const unitR = (Math.PI * 2) / size;
  const arr = [...Array(size)].map((_, i) => i);
  const gapRate = getSizeGapScale(shape);
  const width = shape.width * gapRate.x;
  const height = shape.height * gapRate.y;
  const c = { x: shape.width / 2, y: height / 2 };

  const outerRadius = { x: width / 2, y: height / 2 };
  const outerRadFrom = -Math.PI / 2;
  const ops = arr.map<IVec2>((i) => {
    const r = unitR * i + outerRadFrom;
    return { x: Math.cos(r) * outerRadius.x + c.x, y: Math.sin(r) * outerRadius.y + c.y };
  });

  const rate = getRadiusRate(shape);
  const innerRadius = { x: width * rate, y: height * rate };
  const innerRadFrom = unitR / 2 - Math.PI / 2;
  const ips = arr.map<IVec2>((i) => {
    const r = unitR * i + innerRadFrom;
    return { x: Math.cos(r) * innerRadius.x + c.x, y: Math.sin(r) * innerRadius.y + c.y };
  });

  const path: IVec2[] = [];
  for (let i = 0; i < ops.length; i++) {
    path.push(ops[i], ips[i]);
  }

  return { path };
}

/**
 * Returns the star origin.
 * When the size is even number, the origin is at the center of the shape.
 * When the size is odd number, the origin isn't always at the center.
 */
export function getRawStarOrigin(shape: StarShape): IVec2 {
  const gapRate = getSizeGapScale(shape);
  const height = shape.height * gapRate.y;
  return { x: shape.width / 2, y: height / 2 };
}

function getSizeGapScale(shape: StarShape): IVec2 {
  if (isRegularPolygon(shape)) return { x: 1, y: 1 };

  const size = getSize(shape);
  const unitR = (Math.PI * 2) / size;
  const from = -Math.PI / 2;
  const innerRadiusRate = getRadiusRate(shape) * 2;

  const bottomIndex = Math.ceil(size / 2);
  const bottomInnerIndex = Math.floor(size / 2);
  const h = Math.max(
    Math.sin(from + unitR * bottomIndex),
    Math.sin(from + unitR * (0.5 + bottomInnerIndex)) * innerRadiusRate,
  );

  // Check both "floor" and "ceil" because either of them can be the widest vertex.
  // Avoid picking 0 when size is 3.
  const rightIndex0 = Math.max(1, Math.floor(size / 4));
  const rightIndex1 = Math.min(size - 1, Math.ceil(size / 4));
  const rightInnerIndex = Math.floor(size / 4);
  const w = Math.max(
    Math.cos(from + unitR * rightIndex0),
    Math.cos(from + unitR * rightIndex1),
    Math.cos(from + unitR * (0.5 + rightInnerIndex)) * innerRadiusRate,
  );

  // Each side expect for top can have gap because this shape is based on the top.
  return { x: 1 / w, y: 1 / ((1 + h) / 2) };
}

/**
 * Returns maximum c0 that makes the shape convex.
 */
export function getFlatStarC0(shape: StarShape): IVec2 {
  // Both gap scales are always 1 either when
  // - the size is a multiple of 4.
  // - it's a regular polygon.
  if (shape.size % 4 === 0 || isRegularPolygon(shape)) {
    const c = { x: shape.width / 2, y: shape.height / 2 };
    const convex = { ...shape, c0: { x: 0.5, y: 0 } };
    const convexPath = getRawStarPath(convex).path;
    const guide = [convexPath[0], convexPath[2]];
    const r = Math.PI / 2 + getRadian(convexPath[1], c);
    const rotateFn = getRotateFn(r, c);
    const intersection = getCrossLineAndLine([c, rotateFn(convexPath[0])], guide);
    if (!intersection) return shape.c0;

    const aspectRatio = shape.height / shape.width;
    const dy = getNorm({
      x: (intersection.x - c.x) * aspectRatio,
      y: intersection.y - c.y,
    });
    return { x: 0.5, y: (c.y - dy) / shape.height };
  }

  const gapScale = getSizeGapScale({ ...shape, c0: { x: 0.5, y: 0.5 } });
  if (shape.size % 2 === 0) return { x: 0.5, y: (1 - 1 / gapScale.x) / 2 };
  return { x: 0.5, y: 1 - 1 / gapScale.y };
}

/**
 * Returns c0 that makes the shape look coordinate.
 */
export function getCoordinateStarC0(shape: StarShape): IVec2 {
  const concave = { ...shape, c0: { x: 0.5, y: 0.49 } };
  const concavePath = getRawStarPath(concave).path;
  const gapScale = getSizeGapScale(concave);
  const guide = [concavePath[2], concavePath[concavePath.length - 2]];
  const concaveOrigin = getRawStarOrigin(concave);
  const r = Math.PI / 2 + getRadian(concavePath[1], concaveOrigin);
  const rotateFn = getRotateFn(r, concaveOrigin);
  const intersection = getCrossLineAndLine([concaveOrigin, rotateFn(concavePath[0])], guide);
  if (!intersection) return shape.c0;

  const aspectRatio = shape.height / shape.width;
  const gapRatio = gapScale.y / gapScale.x;
  const dy = getNorm({
    x: (intersection.x - concaveOrigin.x) * aspectRatio * gapRatio,
    y: intersection.y - concaveOrigin.y,
  });
  return { x: 0.5, y: (concaveOrigin.y - dy) / (shape.height * gapScale.y) };
}

function isRegularPolygon(shape: StarShape): boolean {
  return shape.sizeType === 1;
}
