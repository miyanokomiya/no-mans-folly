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
import { getTriangleIncenter } from "../../utils/geometry";

export type TriangleShape = SimplePolygonShape & {
  cr?: number; // 0 by default
  c0?: IVec2; // { x: 0.5, y: 0 } by default
};

const baseStruct = getStructForSimplePolygon<TriangleShape>(getPath);

export const struct: ShapeStruct<TriangleShape> = {
  ...baseStruct,
  label: "Triangle",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "triangle",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      direction: arg.direction,
      cr: arg.cr,
      c0: arg.c0 ?? { x: 0.5, y: 0 },
    };
  },
  applyScale(shape, scaleValue) {
    return {
      ...baseStruct.applyScale?.(shape, scaleValue),
      cr: shape.cr ? Math.max(0, shape.cr * Math.min(scaleValue.x, scaleValue.y)) : undefined,
    };
  },
  getTextRangeRect(shape) {
    return getSimpleShapeTextRangeRect(shape, (s) => {
      const [t, r, l] = getRawGap(s);
      const topXR = getDefaultTriangleTopC(s).x;
      return {
        x: s.p.x + (s.width * topXR - l) / 2,
        y: s.p.y + (s.height - t) / 2,
        width: (s.width + l + r) / 2,
        height: (s.height + t) / 2,
      };
    });
  },
  canAttachSmartBranch: true,
};

function getPath(src: TriangleShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

function getRawPath(shape: TriangleShape): SimplePath {
  let path = [
    { x: shape.width * getDefaultTriangleTopC(shape).x, y: 0 },
    { x: shape.width, y: shape.height },
    { x: 0, y: shape.height },
  ];

  let curves: SimplePath["curves"];
  if (shape.cr) {
    const srcPath = path;
    const cr = getTriangleCornerSize(shape);
    const infoT = getCornerRadiusArc(srcPath[2], srcPath[0], srcPath[1], cr);
    const controlT = getBezierControlForArc(infoT[0], infoT[1], infoT[2]);
    const infoR = getCornerRadiusArc(srcPath[0], srcPath[1], srcPath[2], cr);
    const controlR = getBezierControlForArc(infoR[0], infoR[1], infoR[2]);
    const infoL = getCornerRadiusArc(srcPath[1], srcPath[2], srcPath[0], cr);
    const controlL = getBezierControlForArc(infoL[0], infoL[1], infoL[2]);

    const gapT = infoT[0].y - cr;
    const gapR = shape.width - infoR[0].x - cr;
    const gapL = infoL[0].x - cr;

    const toTop = { x: 0, y: -gapT };
    const toLeft = { x: -gapL, y: 0 };
    const toRight = { x: gapR, y: 0 };

    path = [
      add(toTop, infoT[1]),
      add(toTop, infoT[2]),
      add(toRight, infoR[1]),
      add(toRight, infoR[2]),
      add(toLeft, infoL[1]),
      add(toLeft, infoL[2]),
    ];
    curves = [
      shiftBezierCurveControl(controlT, toTop),
      undefined,
      shiftBezierCurveControl(controlR, toRight),
      undefined,
      shiftBezierCurveControl({ c1: controlL.c1, c2: controlL.c2 }, toLeft),
    ];
  }

  return { path, curves };
}

function getRawGap(shape: TriangleShape): [top: number, right: number, left: number] {
  const path = [
    { x: shape.width * getDefaultTriangleTopC(shape).x, y: 0 },
    { x: shape.width, y: shape.height },
    { x: 0, y: shape.height },
  ];

  if (!shape.cr) return [0, 0, 0];

  const cr = getTriangleCornerSize(shape);
  const infoT = getCornerRadiusArc(path[2], path[0], path[1], cr);
  const infoR = getCornerRadiusArc(path[0], path[1], path[2], cr);
  const infoL = getCornerRadiusArc(path[1], path[2], path[0], cr);

  const gapT = infoT[0].y - cr;
  const gapR = shape.width - infoR[0].x - cr;
  const gapL = infoL[0].x - cr;
  return [gapT, gapR, gapL];
}

export function getDefaultTriangleTopC(shape: TriangleShape): IVec2 {
  return shape.c0 ?? { x: 0.5, y: 0 };
}

function getTriangleCornerSize(shape: TriangleShape): number {
  return clamp(0, getTriangleCornerMaxSize(shape), shape.cr ?? 0);
}

export function getTriangleCornerMaxSize(shape: TriangleShape): number {
  const c0 = getDefaultTriangleTopC(shape);
  const ic = getTriangleIncenter(
    { x: shape.width * c0.x, y: 0 },
    { x: shape.width, y: shape.height },
    { x: 0, y: shape.height },
  );
  return shape.height - ic.y;
}
