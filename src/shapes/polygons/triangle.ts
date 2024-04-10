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

export type TriangleShape = SimplePolygonShape & {
  cr?: number; // 0 by default
};

export const struct: ShapeStruct<TriangleShape> = {
  ...getStructForSimplePolygon<TriangleShape>(getPath),
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
      cr: arg.cr,
      direction: arg.direction,
    };
  },
  getTextRangeRect(shape) {
    const rawGap = getRawGap(shape);
    const rect = {
      x: shape.p.x + shape.width * 0.25 - rawGap.x / 2,
      y: shape.p.y + (shape.height - rawGap.y) / 2,
      width: shape.width / 2 + rawGap.x,
      height: (shape.height + rawGap.y) / 2,
    };
    return getSimpleShapeTextRangeRect(shape, rect);
  },
  canAttachSmartBranch: true,
};

function getPath(src: TriangleShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

function getRawPath(shape: TriangleShape): SimplePath {
  let path = [
    { x: shape.width / 2, y: 0 },
    { x: shape.width, y: shape.height },
    { x: 0, y: shape.height },
  ];

  let curves: SimplePath["curves"];
  if (shape.cr) {
    const srcPath = path;
    const cr = clamp(0, Math.min(shape.width, shape.height) / 2, shape.cr);
    const infoT = getCornerRadiusArc(srcPath[2], srcPath[0], srcPath[1], cr);
    const controlT = getBezierControlForArc(infoT[0], infoT[1], infoT[2]);
    const infoR = getCornerRadiusArc(srcPath[0], srcPath[1], srcPath[2], cr);
    const controlR = getBezierControlForArc(infoR[0], infoR[1], infoR[2]);

    const gapY = infoT[0].y - cr;
    const gapX = shape.width - infoR[0].x - cr;
    const r2l = (p: IVec2) => ({ x: srcPath[1].x - p.x, y: p.y });
    const toTop = { x: 0, y: -gapY };
    const toLeft = { x: -gapX, y: 0 };
    const toRight = { x: gapX, y: 0 };

    path = [
      add(toTop, infoT[1]),
      add(toTop, infoT[2]),
      add(toRight, infoR[1]),
      add(toRight, infoR[2]),
      add(toLeft, r2l(infoR[2])),
      add(toLeft, r2l(infoR[1])),
    ];
    curves = [
      shiftBezierCurveControl(controlT, toTop),
      undefined,
      shiftBezierCurveControl(controlR, toRight),
      undefined,
      shiftBezierCurveControl({ c1: r2l(controlR.c2), c2: r2l(controlR.c1) }, toLeft),
    ];
  }

  return { path, curves };
}

function getRawGap(shape: TriangleShape): IVec2 {
  const path = [
    { x: shape.width / 2, y: 0 },
    { x: shape.width, y: shape.height },
    { x: 0, y: shape.height },
  ];

  if (!shape.cr) return { x: 0, y: 0 };

  const cr = clamp(0, Math.min(shape.width, shape.height) / 2, shape.cr);
  const infoT = getCornerRadiusArc(path[2], path[0], path[1], cr);
  const infoR = getCornerRadiusArc(path[0], path[1], path[2], cr);

  const gapY = infoT[0].y - cr;
  const gapX = shape.width - infoR[0].x - cr;
  return { x: gapX, y: gapY };
}
