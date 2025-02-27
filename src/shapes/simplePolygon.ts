import {
  AffineMatrix,
  IDENTITY_AFFINE,
  IRectangle,
  IVec2,
  add,
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
  getGlobalAffine,
  getMarkersOnPolygon,
  getPointLerpSlope,
  getRectPathRotation,
  getRectPoints,
  getRelativeRateWithinRect,
  getRotateFn,
  getRotatedRectAffine,
  getRotatedWrapperRect,
  getRotationAffine,
  getSegments,
  isPointOnRectangle,
  isSameValue,
  rotateRectByAngle,
  sortPointFrom,
} from "../utils/geometry";
import { applyFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import { applyStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { BezierCurveControl, CommonStyle, Direction4, Size } from "../models";
import { applyCurvePath, applyLocalSpace, createSVGCurvePath } from "../utils/renderer";
import { pickMinItem } from "../utils/commons";
import { applyRotatedRectTransformToRawPath, renderTransform } from "../utils/svgElements";
import { getPaddingRect } from "../utils/boxPadding";
import { RectPolygonShape, getRectShapeRect, getShapeDetransform, getShapeTransform } from "./rectPolygon";
import { getClosestPointOnPolyline, getPolylineEdgeInfo } from "../utils/path";

export type SimplePath = {
  path: IVec2[];
  curves?: (BezierCurveControl | undefined)[];
};

export type SimplePolygonShape = RectPolygonShape &
  CommonStyle &
  TextContainer & {
    // Default direction should be 1: undefined should mean 1.
    direction?: Direction4;
  };

/**
 * "getPath" and "getCurves" shoud points on the local space of a shape.
 */
export function getStructForSimplePolygon<T extends SimplePolygonShape>(
  getPath: (s: T) => SimplePath,
  options?: {
    outlineSnap?: "trbl";
    // Should return local points
    getOutlineSnaps?: (s: T) => IVec2[];
  },
): Pick<
  ShapeStruct<T>,
  | "render"
  | "getClipPath"
  | "createSVGElementInfo"
  | "createClipSVGPath"
  | "getWrapperRect"
  | "getLocalRectPolygon"
  | "isPointOn"
  | "getClosestOutline"
  | "getTangentAt"
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
          ctx.fill("evenodd");
        }
        if (!shape.stroke.disabled) {
          applyStrokeStyle(ctx, shape.stroke);
          ctx.stroke();
        }
      });
    },
    getClipPath(shape) {
      const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
      const { path, curves } = getPath(shape);

      const region = new Path2D();
      const localRegion = new Path2D();
      applyCurvePath(localRegion, path, curves, true);
      const m = getRotatedRectAffine(rect, shape.rotation);
      region.addPath(localRegion, { a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] });
      return region;
    },
    createSVGElementInfo(shape) {
      const transform = getShapeTransform(shape);
      const { path, curves } = getPath(shape);

      return {
        tag: "path",
        attributes: {
          transform: renderTransform(transform),
          d: pathSegmentRawsToString(createSVGCurvePath(path, curves, true)),
          "fill-rule": "evenodd",
          ...renderFillSVGAttributes(shape.fill),
          ...renderStrokeSVGAttributes(shape.stroke),
        },
      };
    },
    createClipSVGPath(shape) {
      const { path, curves } = getPath(shape);
      const rawPath = createSVGCurvePath(path, curves, true);
      const rect = getRectShapeRect(shape);
      return pathSegmentRawsToString(applyRotatedRectTransformToRawPath(rect, shape.rotation, rawPath));
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
      const rotation = getRectPathRotation(localRectPolygon);

      const ret: Partial<T> = {};
      if (!isSame(p, shape.p)) ret.p = p;
      if (!isSameValue(width, shape.width)) ret.width = width;
      if (!isSameValue(height, shape.height)) ret.height = height;
      if (!isSameValue(rotation, shape.rotation)) ret.rotation = rotation;

      return ret;
    },
    getClosestOutline(shape, p, threshold, thresholdForMarker = threshold) {
      const { path, curves } = getPath(shape);
      const transform = getShapeTransform(shape);
      const detransform = getShapeDetransform(shape);
      const localP = applyAffine(detransform, p);

      if (options?.outlineSnap === "trbl") {
        const cx = shape.width / 2;
        const cy = shape.height / 2;
        const rotatedClosest = [
          { x: cx, y: 0 },
          { x: shape.width, y: cy },
          { x: cx, y: shape.height },
          { x: 0, y: cy },
        ].find((m) => getDistance(m, localP) <= thresholdForMarker);
        if (rotatedClosest) return applyAffine(transform, rotatedClosest);
      }

      if (options?.getOutlineSnaps) {
        const points = options.getOutlineSnaps(shape);
        const rotatedClosest = points.find((m) => getDistance(m, localP) <= thresholdForMarker);
        if (rotatedClosest) return applyAffine(transform, rotatedClosest);
      }

      if (!curves) {
        // Check conventional markers when the shape doesn't have a curve.
        const rotatedClosest = getMarkersOnPolygon(path).find((m) => getDistance(m, localP) <= thresholdForMarker);
        if (rotatedClosest) return applyAffine(transform, rotatedClosest);
      } else {
        // Ignore conventional markers when the shape has a curve.
        const rotatedClosest = path.find((m) => getDistance(m, localP) <= thresholdForMarker);
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
    getTangentAt(shape, p) {
      const { path, curves } = getPath(shape);
      const edges = getSegments(path, true);
      const edgeInfo = getPolylineEdgeInfo(edges, curves);
      const detransform = getShapeDetransform(shape);
      const localP = applyAffine(detransform, p);

      const closestInfo = getClosestPointOnPolyline(edgeInfo, localP, Infinity);
      if (!closestInfo) return shape.rotation;
      return getPointLerpSlope(edgeInfo.lerpFn, closestInfo[1]) + shape.rotation;
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

export function getDirectionalLocalAbsolutePoints<T extends SimplePolygonShape>(
  src: T,
  normalized: T,
  points: IVec2[],
): IVec2[] {
  const c = { x: src.p.x + src.width / 2, y: src.p.y + src.height / 2 };
  const rotateFn = getRotateFn(normalized.rotation - src.rotation, c);
  return points.map((p) =>
    sub(rotateFn({ x: normalized.p.x + normalized.width * p.x, y: normalized.p.y + normalized.height * p.y }), src.p),
  );
}

export function getLocalAbsolutePoint(shape: SimplePolygonShape, relativeRate: IVec2): IVec2 {
  return {
    x: shape.width * relativeRate.x,
    y: shape.height * relativeRate.y,
  };
}

export function getLocalRelativeRate(shape: SimplePolygonShape, absP: IVec2): IVec2 {
  return getRelativeRateWithinRect({ x: 0, y: 0, width: shape.width, height: shape.height }, absP);
}

export function getMigrateRelativePointFn(
  src: SimplePolygonShape,
  resized: Partial<SimplePolygonShape>,
): (srcC: IVec2, origin: IVec2) => IVec2 {
  const s = getNormalizedSimplePolygonShape(src);
  const resizedS = getNormalizedSimplePolygonShape({ ...src, ...resized });
  return (srcC, origin) => migrateRelativePoint(srcC, s, resizedS, origin);
}

export function migrateRelativePoint(src: IVec2, srcSize: Size, nextSize: Partial<Size>, origin: IVec2) {
  const d = { x: srcSize.width * (src.x - origin.x), y: srcSize.height * (src.y - origin.y) };
  const nextW = nextSize.width ?? srcSize.width;
  const nextH = nextSize.height ?? srcSize.height;
  return { x: nextW === 0 ? 0 : d.x / nextW + origin.x, y: nextH === 0 ? 0 : d.y / nextH + origin.y };
}

export function getAffineByRightExpansion(src: SimplePolygonShape, p: IVec2, min = 10): AffineMatrix {
  if (src.width === 0) return IDENTITY_AFFINE;

  const origin = applyAffine(getShapeTransform(src), {
    x: 0,
    y: src.height / 2,
  });
  const distance = getDistance(p, origin);
  const right = Math.max(distance, min);
  const radDiff = getRadian(p, origin) - src.rotation;
  return getGlobalAffine(
    origin,
    src.rotation,
    multiAffines([getRotationAffine(radDiff), [right / src.width, 0, 0, 1, 0, 0]]),
  );
}

export function getAffineByLeftExpansion(src: SimplePolygonShape, p: IVec2, min = 10): AffineMatrix {
  if (src.width === 0) return IDENTITY_AFFINE;

  const origin = applyAffine(getShapeTransform(src), {
    x: src.width,
    y: src.height / 2,
  });
  const distance = getDistance(p, origin);
  const left = Math.min(src.width - distance, src.width - min);
  const radDiff = getRadian(p, origin) + Math.PI - src.rotation;
  return getGlobalAffine(
    origin,
    src.rotation,
    multiAffines([getRotationAffine(radDiff), [(src.width - left) / src.width, 0, 0, 1, 0, 0]]),
  );
}

export function getAffineByTopExpansion(src: SimplePolygonShape, p: IVec2, min = 10): AffineMatrix {
  if (src.height === 0) return IDENTITY_AFFINE;

  const origin = applyAffine(getShapeTransform(src), {
    x: src.width / 2,
    y: src.height,
  });
  const distance = getDistance(p, origin);
  const top = Math.min(src.height - distance, src.height - min);
  const radDiff = getRadian(p, origin) + Math.PI / 2 - src.rotation;
  return getGlobalAffine(
    origin,
    src.rotation,
    multiAffines([getRotationAffine(radDiff), [1, 0, 0, (src.height - top) / src.height, 0, 0]]),
  );
}

export function getAffineByBottomExpansion(src: SimplePolygonShape, p: IVec2, min = 10): AffineMatrix {
  if (src.height === 0) return IDENTITY_AFFINE;

  const origin = applyAffine(getShapeTransform(src), {
    x: src.width / 2,
    y: 0,
  });
  const distance = getDistance(p, origin);
  const bottom = Math.max(distance, min);
  const radDiff = getRadian(p, origin) - Math.PI / 2 - src.rotation;
  return getGlobalAffine(
    origin,
    src.rotation,
    multiAffines([getRotationAffine(radDiff), [1, 0, 0, bottom / src.height, 0, 0]]),
  );
}

export function getExpansionFn(src: SimplePolygonShape, targetDirection: Direction4) {
  switch (src.direction) {
    case 0:
      switch (targetDirection) {
        case 0:
          return getAffineByLeftExpansion;
        case 2:
          return getAffineByRightExpansion;
        case 3:
          return getAffineByBottomExpansion;
        default:
          return getAffineByTopExpansion;
      }
    case 2:
      switch (targetDirection) {
        case 0:
          return getAffineByRightExpansion;
        case 2:
          return getAffineByLeftExpansion;
        case 3:
          return getAffineByTopExpansion;
        default:
          return getAffineByBottomExpansion;
      }
    case 3:
      switch (targetDirection) {
        case 0:
          return getAffineByBottomExpansion;
        case 2:
          return getAffineByTopExpansion;
        case 3:
          return getAffineByRightExpansion;
        default:
          return getAffineByLeftExpansion;
      }
    default:
      switch (targetDirection) {
        case 0:
          return getAffineByTopExpansion;
        case 2:
          return getAffineByBottomExpansion;
        case 3:
          return getAffineByLeftExpansion;
        default:
          return getAffineByRightExpansion;
      }
  }
}

export function getShapeDirection(shape: SimplePolygonShape): Direction4 {
  return shape.direction ?? 1;
}

export function getNextDirection4(val: Direction4 | undefined): Direction4 {
  return (((val ?? 1) + 1) % 4) as Direction4;
}

export function getNextDirection2(val: Direction4 | undefined): Direction4 {
  return (((val ?? 1) + 1) % 2) as Direction4;
}

export function getDirectionalSimplePath<S extends SimplePolygonShape>(
  src: S,
  getRawPath: (s: S) => SimplePath,
): SimplePath {
  if (src.direction === undefined || src.direction === 1) return getRawPath(src);

  const shape = getNormalizedSimplePolygonShape(src);
  const simplePath = getRawPath(shape);
  const c = { x: src.width / 2, y: src.height / 2 };
  const rotateFn = getRotateFn(shape.rotation - src.rotation, add(c, src.p));
  const convertFn = (p: IVec2) => sub(rotateFn(add(p, shape.p)), src.p);
  return {
    path: simplePath.path.map((p) => convertFn(p)),
    curves: simplePath.curves?.map((c) => (c ? { c1: convertFn(c.c1), c2: convertFn(c.c2) } : undefined)),
  };
}

export function getSimpleShapeTextRangeRect<T extends SimplePolygonShape>(
  shape: T,
  getSrcRect: (s: T) => IRectangle,
): IRectangle {
  const c = { x: shape.p.x + shape.width / 2, y: shape.p.y + shape.height / 2 };

  const normalized = getNormalizedSimplePolygonShape(shape);
  let rect = getSrcRect(normalized);
  switch (shape.direction) {
    case 0: {
      rect = rotateRectByAngle(rect, c, -90);
      break;
    }
    case 2: {
      rect = rotateRectByAngle(rect, c, 90);
      break;
    }
    case 3: {
      rect = rotateRectByAngle(rect, c, 180);
      break;
    }
    default: {
      break;
    }
  }

  return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
}
