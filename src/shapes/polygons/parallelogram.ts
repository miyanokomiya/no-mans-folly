import { IVec2, add, clamp, sub } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import {
  SimplePath,
  SimplePolygonShape,
  getNormalizedSimplePolygonShape,
  getStructForSimplePolygon,
} from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { getRotateFn } from "../../utils/geometry";
import { getBezierControlForArc, getCornerRadiusArc, shiftBezierCurveControl } from "../../utils/path";

export type ParallelogramShape = SimplePolygonShape & {
  c0: IVec2;
  cr?: number; // 0 by default
};

export const struct: ShapeStruct<ParallelogramShape> = {
  ...getStructForSimplePolygon<ParallelogramShape>(getPath),
  label: "Parallelogram",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "parallelogram",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 0.7, y: 0 },
      cr: arg.cr,
      direction: arg.direction,
    };
  },
  getTextRangeRect(shape) {
    switch (shape.direction) {
      case 0: {
        const d = shape.height * Math.abs(shape.c0.x - 0.5);
        const innerTop = d;
        const innerBottom = shape.height - d;
        const rect = {
          x: shape.p.x,
          y: shape.p.y + innerTop,
          width: shape.width,
          height: innerBottom - innerTop,
        };
        return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
      }
      default: {
        const d = shape.width * Math.abs(shape.c0.x - 0.5);
        const innerLeft = d;
        const innerRight = shape.width - d;
        const rect = {
          x: shape.p.x + innerLeft,
          y: shape.p.y,
          width: innerRight - innerLeft,
          height: shape.height,
        };
        return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
      }
    }
  },
  canAttachSmartBranch: true,
};

function getPath(src: ParallelogramShape): SimplePath {
  if (src.direction === undefined || src.direction === 1) return getRawPath(src);

  const shape = getNormalizedSimplePolygonShape(src);
  const c = { x: src.width / 2, y: src.height / 2 };
  const rotateFn = getRotateFn(shape.rotation - src.rotation, add(c, src.p));
  const adjustFn = (p: IVec2) => sub(rotateFn(add(p, shape.p)), src.p);
  const { path, curves } = getRawPath(shape);
  return {
    path: path.map((p) => adjustFn(p)),
    curves: curves?.map((c) => (c ? { c1: adjustFn(c.c1), c2: adjustFn(c.c2) } : undefined)),
  };
}

function getRawPath(shape: ParallelogramShape): SimplePath {
  const dx = (clamp(0, 1, shape.c0.x) - 0.5) * shape.width;

  let path: IVec2[];
  let curves: SimplePath["curves"];

  if (dx < 0) {
    path = [
      { x: 0, y: 0 },
      { x: shape.width + dx, y: 0 },
      { x: shape.width, y: shape.height },
      { x: -dx, y: shape.height },
    ];
  } else {
    path = [
      { x: dx, y: 0 },
      { x: shape.width, y: 0 },
      { x: shape.width - dx, y: shape.height },
      { x: 0, y: shape.height },
    ];
  }

  if (shape.cr) {
    const srcPath = path;
    const cr = clamp(0, getMaxParallelogramCornerRadius(shape), shape.cr);
    const info0 = getCornerRadiusArc(srcPath[0], srcPath[1], srcPath[2], cr);
    const control0 = getBezierControlForArc(info0[0], info0[1], info0[2]);
    const info1 = getCornerRadiusArc(srcPath[1], srcPath[2], srcPath[3], cr);
    const control1 = getBezierControlForArc(info1[0], info1[1], info1[2]);

    const trTobl = (p: IVec2) => ({ x: srcPath[1].x - p.x + srcPath[3].x, y: srcPath[1].y - p.y + srcPath[3].y });
    const brTotl = (p: IVec2) => ({ x: srcPath[2].x - p.x + srcPath[0].x, y: srcPath[2].y - p.y + srcPath[0].y });

    // Fulfill the corner gap by expanding tha path.
    const gap = shape.width - (shape.c0.x > 0.5 ? info0 : info1)[0].x - cr;
    const toRight = { x: gap, y: 0 };
    const toLeft = { x: -gap, y: 0 };

    path = [
      add(info0[1], toRight),
      add(info0[2], toRight),
      add(info1[1], toRight),
      add(info1[2], toRight),
      add(trTobl(info0[1]), toLeft),
      add(trTobl(info0[2]), toLeft),
      add(brTotl(info1[1]), toLeft),
      add(brTotl(info1[2]), toLeft),
    ];
    curves = [
      shiftBezierCurveControl(control0, toRight),
      undefined,
      shiftBezierCurveControl(control1, toRight),
      undefined,
      shiftBezierCurveControl({ c1: trTobl(control0.c1), c2: trTobl(control0.c2) }, toLeft),
      undefined,
      shiftBezierCurveControl({ c1: brTotl(control1.c1), c2: brTotl(control1.c2) }, toLeft),
    ];
  }

  return { path, curves };
}

export function getMaxParallelogramCornerRadius(shape: ParallelogramShape): number {
  return (Math.min(shape.width, shape.height) * (1 - Math.abs(shape.c0.x - 0.5))) / 2;
}
