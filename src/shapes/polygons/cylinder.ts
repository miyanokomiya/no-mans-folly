import { IVec2, pathSegmentRawsToString } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePolygonShape, getShapeTransform, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../../utils/strokeStyle";
import { BezierCurveControl } from "../../models";
import { applyCurvePath, applyLocalSpace, createSVGCurvePath } from "../../utils/renderer";
import { renderTransform } from "../../utils/svgElements";

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
  render(ctx, shape) {
    if (shape.fill.disabled && shape.stroke.disabled) return;

    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const normalShape = { ...shape, p: { x: 0, y: 0 } };
    const path = getPath(normalShape);
    const curves = getCurves(normalShape);

    applyLocalSpace(ctx, rect, shape.rotation, () => {
      if (!shape.fill.disabled) {
        ctx.beginPath();
        applyCurvePath(ctx, path, curves, true);
        applyFillStyle(ctx, shape.fill);
        ctx.fill();
      }
      if (!shape.stroke.disabled) {
        const upperC = curves[0]!;
        const upperY = (shape.c0.y * shape.height) / 2;
        ctx.beginPath();
        applyCurvePath(
          ctx,
          [path[0], path[1], path[0]],
          [
            upperC,
            {
              c1: { x: upperC.c2.x, y: 2 * upperY - upperC.c2.y },
              c2: { x: upperC.c1.x, y: 2 * upperY - upperC.c1.y },
            },
          ],
          true,
        );
        applyStrokeStyle(ctx, shape.stroke);
        ctx.stroke();

        const lowerC = curves[2]!;
        ctx.beginPath();
        applyCurvePath(ctx, [path[1], path[2], path[3], path[0]], [undefined, lowerC]);
        applyStrokeStyle(ctx, shape.stroke);
        ctx.stroke();
      }
    });
  },
  createSVGElementInfo(shape) {
    const transform = getShapeTransform(shape);
    const normalShape = { ...shape, p: { x: 0, y: 0 } };
    const path = getPath(normalShape);
    const curves = getCurves?.(normalShape);

    const innerPath = [path[0], path[1], path[0]];
    const upperC = curves[0]!;
    const upperY = (shape.c0.y * shape.height) / 2;
    const innerCurve = [
      upperC,
      {
        c1: { x: upperC.c2.x, y: 2 * upperY - upperC.c2.y },
        c2: { x: upperC.c1.x, y: 2 * upperY - upperC.c1.y },
      },
    ];
    const innerD = pathSegmentRawsToString(createSVGCurvePath(innerPath, innerCurve));

    return {
      tag: "path",
      attributes: {
        transform: renderTransform(transform),
        d: pathSegmentRawsToString(createSVGCurvePath(path, curves, true)) + ` ${innerD}`,
        ...renderFillSVGAttributes(shape.fill),
        ...renderStrokeSVGAttributes(shape.stroke),
      },
    };
  },
  getTextRangeRect(shape) {
    const ry = getRadiusY(shape);
    const rect = {
      x: shape.p.x,
      y: shape.p.y + ry * 2,
      width: shape.width,
      height: shape.height - ry * 3,
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
  const ry = getRadiusY(shape);
  const v = ry / 0.75; // Magical number to approximate ellipse by cubic bezier.
  const upperY = shape.p.y + ry - v;
  const lowerY = shape.p.y + shape.height - ry + v;

  return [
    { c1: { x: shape.p.x, y: upperY }, c2: { x: shape.p.x + shape.width, y: upperY } },
    undefined,
    {
      c1: { x: shape.p.x + shape.width, y: lowerY },
      c2: { x: shape.p.x, y: lowerY },
    },
    undefined,
  ];
}

function getRadiusY(shape: CylinderShape): number {
  return Math.min(shape.height * shape.c0.y, shape.width) / 2;
}
