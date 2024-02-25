import {
  AffineMatrix,
  IVec2,
  applyAffine,
  getCenter,
  getClosestPointOnBezier3,
  getCrossSegAndBezier3,
  getDistance,
  getRadian,
  getRectCenter,
  isOnPolygon,
  isSame,
  multiAffines,
  pathSegmentRawsToString,
  rotate,
  sub,
} from "okageo";
import { ShapeStruct, TextContainer, getCommonStyle, updateCommonStyle, textContainerModule } from "./core";
import {
  ISegment,
  expandRect,
  getApproxCurvePoints,
  getClosestPointOnSegment,
  getCrossSegAndSeg,
  getCurveSplineBounds,
  getD2,
  getMarkersOnPolygon,
  getRectPoints,
  getRotateFn,
  getRotatedWrapperRect,
  isPointOnRectangle,
  sortPointFrom,
} from "../utils/geometry";
import { applyFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import { applyStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { BezierCurveControl, CommonStyle, Direction4, Shape } from "../models";
import { applyCurvePath, applyLocalSpace, createSVGCurvePath } from "../utils/renderer";
import { pickMinItem } from "../utils/commons";
import { renderTransform } from "../utils/svgElements";

export type SimplePath = {
  path: IVec2[];
  curves?: (BezierCurveControl | undefined)[];
};

export type SimplePolygonShape = Shape &
  CommonStyle &
  TextContainer & {
    width: number;
    height: number;
    // Default direction can depend on each shape type.
    direction?: Direction4;
  };

/**
 * "getPath" and "getCurves" shoud points on the local space of a shape.
 */
export function getStructForSimplePolygon<T extends SimplePolygonShape>(
  getPath: (s: T) => SimplePath,
): Pick<
  ShapeStruct<T>,
  | "render"
  | "createSVGElementInfo"
  | "getWrapperRect"
  | "getLocalRectPolygon"
  | "isPointOn"
  | "getClosestOutline"
  | "resize"
  | "getIntersectedOutlines"
  | "getCommonStyle"
  | "updateCommonStyle"
> {
  return {
    render(ctx, shape) {
      if (shape.fill.disabled && shape.stroke.disabled) return;

      const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
      const { path, curves } = getPath(shape);

      applyLocalSpace(ctx, rect, shape.rotation, () => {
        ctx.beginPath();
        applyCurvePath(ctx, path, curves, true);
        if (!shape.fill.disabled) {
          applyFillStyle(ctx, shape.fill);
          ctx.fill();
        }
        if (!shape.stroke.disabled) {
          applyStrokeStyle(ctx, shape.stroke);
          ctx.stroke();
        }
      });
    },
    createSVGElementInfo(shape) {
      const transform = getShapeTransform(shape);
      const { path, curves } = getPath(shape);

      return {
        tag: "path",
        attributes: {
          transform: renderTransform(transform),
          d: pathSegmentRawsToString(createSVGCurvePath(path, curves, true)),
          ...renderFillSVGAttributes(shape.fill),
          ...renderStrokeSVGAttributes(shape.stroke),
        },
      };
    },
    getWrapperRect(shape, _, includeBounds) {
      let rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
      if (includeBounds) {
        rect = expandRect(rect, getStrokeWidth(shape.stroke) / 2);
      }
      return getRotatedWrapperRect(rect, shape.rotation);
    },
    getLocalRectPolygon(shape) {
      const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
      const c = getRectCenter(rect);
      const rotateFn = getRotateFn(shape.rotation, c);
      return getRectPoints(rect).map((p) => rotateFn(p));
    },
    isPointOn(shape, p) {
      const detransform = getShapeDetransform(shape);
      const localP = applyAffine(detransform, p);
      const { path, curves } = getPath(shape);

      if (!curves) return isOnPolygon(localP, path);
      if (!isPointOnRectangle(getCurveSplineBounds(path, curves), localP)) return false;

      const points = getApproxCurvePoints(path, curves);
      return isOnPolygon(localP, points);
    },
    resize(shape, resizingAffine) {
      const localRectPolygon = this.getLocalRectPolygon(shape).map((p) => applyAffine(resizingAffine, p));
      const center = getCenter(localRectPolygon[0], localRectPolygon[2]);
      const width = getDistance(localRectPolygon[0], localRectPolygon[1]);
      const height = getDistance(localRectPolygon[0], localRectPolygon[3]);
      const p = { x: center.x - width / 2, y: center.y - height / 2 };
      const rotation = getRadian(localRectPolygon[1], localRectPolygon[0]);

      const ret: Partial<T> = {};
      if (!isSame(p, shape.p)) ret.p = p;
      if (width !== shape.width) ret.width = width;
      if (height !== shape.height) ret.height = height;
      if (rotation !== shape.rotation) ret.rotation = rotation;

      return ret;
    },
    getClosestOutline(shape, p, threshold) {
      const { path, curves } = getPath(shape);
      const transform = getShapeTransform(shape);
      const detransform = getShapeDetransform(shape);
      const localP = applyAffine(detransform, p);

      // Ignore conventional markers when the shape has a curve.
      // TODO: Some markers for straight segments may be available.
      // TODO: Prepare some way to declare custom markers from inheritant structs.
      if (!curves) {
        const rotatedClosest = getMarkersOnPolygon(path).find((m) => getDistance(m, localP) <= threshold);
        if (rotatedClosest) return applyAffine(transform, rotatedClosest);
      }

      {
        const points: IVec2[] = [];
        path.forEach((p, i) => {
          const seg: ISegment = [p, path[i + 1 < path.length ? i + 1 : 0]];
          const curve = curves?.[i];
          if (curve) {
            points.push(getClosestPointOnBezier3([seg[0], curve.c1, curve.c2, seg[1]], localP, 0.01));
          } else {
            points.push(getClosestPointOnSegment(seg, localP));
          }
        });
        const closest = pickMinItem(points, (a) => getD2(sub(a, localP)));
        return closest && getDistance(closest, localP) <= threshold ? applyAffine(transform, closest) : undefined;
      }
    },
    getIntersectedOutlines(shape, from, to) {
      const { path, curves } = getPath(shape);
      const transform = getShapeTransform(shape);
      const detransform = getShapeDetransform(shape);
      const localFrom = applyAffine(detransform, from);
      const localTo = applyAffine(detransform, to);

      const intersections: IVec2[] = [];
      path.forEach((p, i) => {
        const seg: ISegment = [p, path[i + 1 < path.length ? i + 1 : 0]];
        const curve = curves?.[i];
        if (curve) {
          const inter = getCrossSegAndBezier3([localFrom, localTo], [seg[0], curve.c1, curve.c2, seg[1]]);
          if (inter.length > 0) intersections.push(...inter);
        } else {
          const inter = getCrossSegAndSeg([localFrom, localTo], seg);
          if (inter) intersections.push(inter);
        }
      });
      return intersections.length > 0
        ? sortPointFrom(localFrom, intersections).map((p) => applyAffine(transform, p))
        : undefined;
    },
    getCommonStyle,
    updateCommonStyle,
    ...textContainerModule,
  };
}

export function getNormalizedSimplePolygonShape<T extends SimplePolygonShape>(shape: T): T {
  switch (shape.direction) {
    case 0:
      return {
        ...shape,
        ...getNormalizedAttrsForVertical(shape),
        rotation: shape.rotation - Math.PI / 2,
      };
    case 2:
      return {
        ...shape,
        ...getNormalizedAttrsForVertical(shape),
        rotation: shape.rotation + Math.PI / 2,
      };
    case 3:
      return { ...shape, rotation: shape.rotation + Math.PI, direction: 1 };
    default:
      return shape;
  }
}

function getNormalizedAttrsForVertical(shape: SimplePolygonShape): Partial<SimplePolygonShape> {
  return {
    p: rotate({ x: shape.p.x, y: shape.p.y + shape.height }, Math.PI / 2, {
      x: shape.p.x + shape.width / 2,
      y: shape.p.y + shape.height / 2,
    }),
    width: shape.height,
    height: shape.width,
    direction: 1,
  };
}

export function getShapeTransform(shape: SimplePolygonShape): AffineMatrix {
  const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const center = getRectCenter(rect);
  const sin = Math.sin(shape.rotation);
  const cos = Math.cos(shape.rotation);

  return multiAffines([
    [1, 0, 0, 1, center.x, center.y],
    [cos, sin, -sin, cos, 0, 0],
    [1, 0, 0, 1, rect.x - center.x, rect.y - center.y],
  ]);
}

export function getShapeDetransform(shape: SimplePolygonShape): AffineMatrix {
  const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const center = getRectCenter(rect);
  const sin = Math.sin(shape.rotation);
  const cos = Math.cos(shape.rotation);

  return multiAffines([
    [1, 0, 0, 1, -(rect.x - center.x), -(rect.y - center.y)],
    [cos, -sin, sin, cos, 0, 0],
    [1, 0, 0, 1, -center.x, -center.y],
  ]);
}

export function getLocalAbsolutePoint(shape: SimplePolygonShape, relativeRate: IVec2): IVec2 {
  return {
    x: shape.width * relativeRate.x,
    y: shape.height * relativeRate.y,
  };
}

export function getLocalRelativeRate(shape: SimplePolygonShape, absP: IVec2): IVec2 {
  return {
    x: absP.x / shape.width,
    y: absP.y / shape.height,
  };
}
