import { IVec2, clamp, pathSegmentRawsToString } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { getShapeTransform } from "../../shapes/rectPolygon";
import {
  SimplePath,
  SimplePolygonShape,
  getDirectionalSimplePath,
  getNormalizedSimplePolygonShape,
  getSimpleShapeTextRangeRect,
  getStructForSimplePolygon,
} from "../simplePolygon";
import { createBoxPadding } from "../../utils/boxPadding";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../../utils/strokeStyle";
import { applyCurvePath, applyLocalSpace, createSVGCurvePath } from "../../utils/renderer";
import { renderTransform } from "../../utils/svgElements";

export type CylinderShape = SimplePolygonShape & {
  /**
   * Relative rate within the shape.
   */
  c0: IVec2;
};

export const struct: ShapeStruct<CylinderShape> = {
  ...getStructForSimplePolygon<CylinderShape>(getPath, { outlineSnap: "trbl" }),
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
      direction: arg.direction,
      c0: arg.c0 ?? { x: 0.5, y: 0.3 },
    };
  },
  render(ctx, src) {
    if (src.fill.disabled && src.stroke.disabled) return;

    const shape = getNormalizedSimplePolygonShape(src);
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const { path, curves } = getPath(shape);

    applyLocalSpace(ctx, rect, shape.rotation, () => {
      if (!shape.fill.disabled) {
        ctx.beginPath();
        applyCurvePath(ctx, path, curves, true);
        applyFillStyle(ctx, shape.fill);
        ctx.fill();
      }
      if (!shape.stroke.disabled) {
        applyStrokeStyle(ctx, shape.stroke);

        const ry = getCylinderRadiusY(shape);
        const upperC = curves[0]!;

        ctx.beginPath();
        applyCurvePath(
          ctx,
          [path[0], path[1], path[0]],
          [
            upperC,
            {
              c1: { x: upperC.c2.x, y: 2 * ry - upperC.c2.y },
              c2: { x: upperC.c1.x, y: 2 * ry - upperC.c1.y },
            },
          ],
          true,
        );
        ctx.stroke();

        const lowerC = curves[2]!;
        ctx.beginPath();
        applyCurvePath(ctx, [path[1], path[2], path[3], path[0]], [undefined, lowerC]);
        ctx.stroke();
      }
    });
  },
  createSVGElementInfo(src) {
    const shape = getNormalizedSimplePolygonShape(src);
    const transform = getShapeTransform(shape);
    const { path, curves } = getPath(shape);

    const innerPath = [path[0], path[1], path[0]];
    const ry = getCylinderRadiusY(shape);
    const upperC = curves[0]!;
    const innerCurve = [
      upperC,
      {
        c1: { x: upperC.c2.x, y: 2 * ry - upperC.c2.y },
        c2: { x: upperC.c1.x, y: 2 * ry - upperC.c1.y },
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
  getTextRangeRect(src) {
    return getSimpleShapeTextRangeRect(src, (shape) => {
      const ry = getCylinderRadiusY(shape);

      return {
        x: shape.p.x,
        y: shape.p.y + ry * 2 + Math.min(0, ry),
        width: shape.width,
        height: shape.height - ry * 3,
      };
    });
  },
  canAttachSmartBranch: true,
};

function getPath(shape: CylinderShape): SimplePath & Required<Pick<SimplePath, "curves">> {
  return getDirectionalSimplePath(shape, getRawPath) as SimplePath & Required<Pick<SimplePath, "curves">>;
}

function getRawPath(shape: CylinderShape): SimplePath {
  const ry = getCylinderRadiusY(shape);
  const v = ry / 0.75; // Magical number to approximate ellipse by cubic bezier.
  const upperY = ry - v;
  const lowerY = shape.height - ry + v;

  return {
    path: [
      { x: 0, y: ry },
      { x: shape.width, y: ry },
      { x: shape.width, y: shape.height - ry },
      { x: 0, y: shape.height - ry },
    ],
    curves: [
      { c1: { x: 0, y: upperY }, c2: { x: shape.width, y: upperY } },
      undefined,
      {
        c1: { x: shape.width, y: lowerY },
        c2: { x: 0, y: lowerY },
      },
      undefined,
    ],
  };
}

function getCylinderRadiusY(shape: CylinderShape): number {
  return clamp(0, getCylinderMaxRadiusY(shape), (shape.height * shape.c0.y) / 2);
}

export function getCylinderMaxRadiusY(shape: CylinderShape): number {
  return Math.min(shape.height, shape.width) / 2;
}
