import {
  IVec2,
  applyAffine,
  getCenter,
  getDistance,
  getRadian,
  getRectCenter,
  isOnPolygon,
  isSame,
  pathSegmentRawsToString,
  rotate,
} from "okageo";
import { ShapeStruct, TextContainer, getCommonStyle, updateCommonStyle, textContainerModule } from "./core";
import {
  expandRect,
  getApproxCurvePoints,
  getApproxCurvePointsFromStruct,
  getClosestOutlineOnPolygonWithLength,
  getCurvePathStructs,
  getCurveSplineBounds,
  getIntersectedOutlinesOnPolygon,
  getIntersectedOutlinesOnPolygonWIthSrc,
  getMarkersOnPolygon,
  getRectPoints,
  getRotateFn,
  getRotatedWrapperRect,
  isPointOnRectangle,
} from "../utils/geometry";
import { applyFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import { applyStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { BezierCurveControl, CommonStyle, Direction4, Shape } from "../models";
import { applyCurvePath, createSVGCurvePath } from "../utils/renderer";

export type SimplePolygonShape = Shape &
  CommonStyle &
  TextContainer & {
    width: number;
    height: number;
    // Default direction can depend on each shape type.
    direction?: Direction4;
  };

export function getStructForSimplePolygon<T extends SimplePolygonShape>(
  getPath: (shape: T) => IVec2[],
  getCurves?: (shape: T) => (BezierCurveControl | undefined)[],
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

      const center = { x: shape.p.x + shape.width / 2, y: shape.p.y + shape.height / 2 };
      const rotateFn = getRotateFn(shape.rotation, center);
      const path = getPath(shape).map((p) => rotateFn(p));
      const curves = getCurves?.(shape).map((c) => (c ? { c1: rotateFn(c.c1), c2: rotateFn(c.c2) } : undefined));

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
    },
    createSVGElementInfo(shape) {
      const center = { x: shape.p.x + shape.width / 2, y: shape.p.y + shape.height / 2 };
      const rotateFn = getRotateFn(shape.rotation, center);
      const path = getPath(shape).map((p) => rotateFn(p));
      const curves = getCurves?.(shape).map((c) => (c ? { c1: rotateFn(c.c1), c2: rotateFn(c.c2) } : undefined));

      return {
        tag: "path",
        attributes: {
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
      const center = { x: shape.p.x + shape.width / 2, y: shape.p.y + shape.height / 2 };
      const rotatedP = rotate(p, -shape.rotation, center);
      const path = getPath(shape);
      const curves = getCurves?.(shape);

      if (!curves) return isOnPolygon(rotatedP, path);
      if (!isPointOnRectangle(getCurveSplineBounds(path, curves), rotatedP)) return false;

      const points = getApproxCurvePoints(path, curves);
      return isOnPolygon(rotatedP, points);
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
      const path = getPath(shape);
      const curves = getCurves?.(shape);
      const center = { x: shape.p.x + shape.width / 2, y: shape.p.y + shape.height / 2 };
      const rotateFn = getRotateFn(shape.rotation, center);
      const rotatedP = rotateFn(p, true);

      // Ignore conventional markers when the shape has a curve.
      // TODO: Some markers for straight segments may be available.
      // TODO: Prepare some way to declare custom markers for inheritant shapes.
      if (!curves) {
        const rotatedClosest = getMarkersOnPolygon(path).find((m) => getDistance(m, rotatedP) <= threshold);
        if (rotatedClosest) return rotateFn(rotatedClosest);
      }

      {
        const pathStructs = getCurvePathStructs([...path, path[0]], curves);
        const pointInfos = getApproxCurvePointsFromStruct(pathStructs);
        const pointInfoMap = new Map(pointInfos.map((info) => [info[0], info]));

        const closestInfo = getClosestOutlineOnPolygonWithLength(
          pointInfos.map(([p]) => p),
          rotatedP,
          threshold,
        );
        if (closestInfo) {
          const pointInfo = pointInfoMap.get(closestInfo[1])!;
          const segmentStruct = pathStructs[pointInfo[1]];
          if (!segmentStruct.curve) return rotateFn(closestInfo[0]);

          const rate = pointInfo[2] + closestInfo[2] / pointInfo[3];
          return rotateFn(segmentStruct.lerpFn(rate));
        }
      }
    },
    getIntersectedOutlines(shape, from, to) {
      const center = { x: shape.p.x + shape.width / 2, y: shape.p.y + shape.height / 2 };
      const rotateFn = getRotateFn(shape.rotation, center);
      const path = getPath(shape);
      const curves = getCurves?.(shape);
      const rotatedFrom = rotateFn(from, true);
      const rotatedTo = rotateFn(to, true);

      if (!curves) return getIntersectedOutlinesOnPolygon(path, rotatedFrom, rotatedTo)?.map((p) => rotateFn(p));

      const pathStructs = getCurvePathStructs([...path, path[0]], curves);
      const pointInfos = getApproxCurvePointsFromStruct(pathStructs);
      const pointInfoMap = new Map(pointInfos.map((info) => [info[0], info]));
      const approxOutlines = getIntersectedOutlinesOnPolygonWIthSrc(
        pointInfos.map(([p]) => p),
        rotatedFrom,
        rotatedTo,
      );
      if (!approxOutlines) return;

      return approxOutlines.map((a) => {
        const pointInfo = pointInfoMap.get(a[1])!;
        const segmentStruct = pathStructs[pointInfo[1]];
        if (!segmentStruct.curve) return a[0];

        // TODO
        const remainderRate = getDistance(a[1], a[0]) / getDistance(a[1], a[2]);
        const rate = pointInfo[2] + remainderRate / pointInfo[3];
        return rotateFn(segmentStruct.lerpFn(rate));
      });
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
