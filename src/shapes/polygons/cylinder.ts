import { IVec2 } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { BezierCurveControl } from "../../models";

export type CylinderShape = SimplePolygonShape & {
  c0: IVec2; // Relative rate from "p"
};

export const struct: ShapeStruct<CylinderShape> = {
  ...getStructForSimplePolygon<CylinderShape>(getPath, getCurves),
  label: "Cylinder",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "cylinder",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 0.5, y: 0.3 },
    };
  },
  getTextRangeRect(shape) {
    const path = getPath(shape);
    const innerLeft = Math.max(path[0].x, path[3].x);
    const innerRight = Math.min(path[1].x, path[2].x);
    const rect = {
      x: innerLeft,
      y: shape.p.y,
      width: innerRight - innerLeft,
      height: shape.height,
    };
    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
  canAttachSmartBranch: true,
};

function getPath(shape: CylinderShape): IVec2[] {
  const ry = getRadiusY(shape);

  return [
    { x: shape.p.x, y: shape.p.y + ry },
    { x: shape.p.x + shape.width, y: shape.p.y + ry },
    { x: shape.p.x + shape.width, y: shape.p.y + shape.height - ry },
    { x: shape.p.x, y: shape.p.y + shape.height - ry },
  ];
}

function getCurves(shape: CylinderShape): (BezierCurveControl | undefined)[] {
  return [
    { c1: { x: shape.p.x, y: shape.p.y }, c2: { x: shape.p.x + shape.width, y: shape.p.y } },
    undefined,
    {
      c1: { x: shape.p.x + shape.width, y: shape.p.y + shape.height },
      c2: { x: shape.p.x, y: shape.p.y + shape.height },
    },
    undefined,
  ];
}

function getRadiusY(shape: CylinderShape): number {
  return Math.min(shape.height * shape.c0.y, shape.width) / 2;
}
