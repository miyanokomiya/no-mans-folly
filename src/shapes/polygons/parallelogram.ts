import { IVec2, add, clamp } from "okageo";
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
    return getSimpleShapeTextRangeRect(shape, (s) => {
      const d = s.width * Math.abs(s.c0.x - 0.5);
      const innerLeft = d;
      const innerRight = s.width - d;
      return {
        x: s.p.x + innerLeft,
        y: s.p.y,
        width: innerRight - innerLeft,
        height: s.height,
      };
    });
  },
  canAttachSmartBranch: true,
};

function getPath(src: ParallelogramShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
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
