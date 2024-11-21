import {
  IRectangle,
  IVec2,
  applyAffine,
  getCenter,
  getDistance,
  getRadian,
  getRectCenter,
  isSame,
  pathSegmentRawsToString,
  rotate,
} from "okageo";
import { CommonStyle } from "../models";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import {
  getClosestOutlineOnRectangle,
  getRectPoints,
  getRotateFn,
  getRotatedWrapperRect,
  isPointOnRectangleRotated,
  expandRect,
  getIntersectedOutlinesOnPolygon,
  getRotatedRectAffine,
  isSameValue,
  getSegments,
  getPointLerpSlope,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import {
  ShapeStruct,
  TextContainer,
  createBaseShape,
  getCommonStyle,
  textContainerModule,
  updateCommonStyle,
} from "./core";
import { createBoxPadding, getPaddingRect } from "../utils/boxPadding";
import { renderTransform } from "../utils/svgElements";
import { RectPolygonShape } from "./rectPolygon";
import { applyPath, createSVGCurvePath } from "../utils/renderer";
import { getClosestOutlineInfoOfLineByEdgeInfo, getPolylineEdgeInfo } from "../utils/path";

export type RectangleShape = RectPolygonShape & CommonStyle & TextContainer;

export const struct: ShapeStruct<RectangleShape> = {
  label: "Rectangle",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "rectangle",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
    };
  },
  render(ctx, shape) {
    if (shape.fill.disabled && shape.stroke.disabled) return;

    const rectPolygon = getLocalRectPolygon(shape);
    ctx.beginPath();
    applyPath(ctx, rectPolygon, true);
    if (!shape.fill.disabled) {
      applyFillStyle(ctx, shape.fill);
      ctx.fill();
    }
    if (!shape.stroke.disabled) {
      applyStrokeStyle(ctx, shape.stroke);
      ctx.stroke();
    }
  },
  getClipPath(shape) {
    const rectPolygon = getLocalRectPolygon(shape);

    const region = new Path2D();
    applyPath(region, rectPolygon, true);
    return region;
  },
  createSVGElementInfo(shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const affine = getRotatedRectAffine(rect, shape.rotation);

    return {
      tag: "rect",
      attributes: {
        width: shape.width,
        height: shape.height,
        transform: renderTransform(affine),
        ...renderFillSVGAttributes(shape.fill),
        ...renderStrokeSVGAttributes(shape.stroke),
      },
    };
  },
  createClipSVGPath(shape) {
    const rectPolygon = getLocalRectPolygon(shape);
    const rawPath = createSVGCurvePath(rectPolygon, undefined, true);
    return pathSegmentRawsToString(rawPath);
  },
  getWrapperRect(shape, _, includeBounds) {
    let rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    if (includeBounds) {
      rect = expandRect(rect, getStrokeWidth(shape.stroke) / 2);
    }
    return getRotatedWrapperRect(rect, shape.rotation);
  },
  getLocalRectPolygon,
  getTextRangeRect(shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    return getPaddingRect(shape.textPadding, rect);
  },
  isPointOn(shape, p) {
    return isPointOnRectangleRotated(
      { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height },
      shape.rotation,
      p,
    );
  },
  resize(shape, resizingAffine) {
    const rectPolygon = getLocalRectPolygon(shape).map((p) => applyAffine(resizingAffine, p));
    const center = getCenter(rectPolygon[0], rectPolygon[2]);
    const width = getDistance(rectPolygon[0], rectPolygon[1]);
    const height = getDistance(rectPolygon[0], rectPolygon[3]);
    const p = { x: center.x - width / 2, y: center.y - height / 2 };
    const rotation = getRadian(rectPolygon[1], rectPolygon[0]);

    const ret: Partial<RectangleShape> = {};
    if (!isSame(p, shape.p)) ret.p = p;
    if (!isSameValue(width, shape.width)) ret.width = width;
    if (!isSameValue(height, shape.height)) ret.height = height;
    if (!isSameValue(rotation, shape.rotation)) ret.rotation = rotation;

    return ret;
  },
  getClosestOutline(shape, p, threshold) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const center = getRectCenter(rect);
    const rotateFn = getRotateFn(shape.rotation, center);
    const rotatedP = rotateFn(p, true);

    {
      const markers = getMarkers(rect, center);
      const rotatedClosest = markers.find((m) => getDistance(m, rotatedP) <= threshold);
      if (rotatedClosest) return rotateFn(rotatedClosest);
    }

    {
      const rotatedClosest = getClosestOutlineOnRectangle(rect, rotatedP, threshold);
      if (rotatedClosest) return rotateFn(rotatedClosest);
    }
  },
  getIntersectedOutlines(shape, from, to) {
    const polygon = getLocalRectPolygon(shape);
    return getIntersectedOutlinesOnPolygon(polygon, from, to);
  },
  getTangentAt(shape, p) {
    const edges = getSegments(getLocalRectPolygon(shape));
    const edgeInfo = getPolylineEdgeInfo(edges);

    const closestInfo = getClosestOutlineInfoOfLineByEdgeInfo(edgeInfo, p, Infinity);
    if (!closestInfo) return shape.rotation;
    return getPointLerpSlope(edgeInfo.lerpFn, closestInfo[1]) + shape.rotation;
  },
  getCommonStyle,
  updateCommonStyle,
  canAttachSmartBranch: true,
  rectangularOptimizedSegment: true,
  ...textContainerModule,
};

function getLocalRectPolygon(shape: RectangleShape): IVec2[] {
  const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const c = getRectCenter(rect);
  return getRectPoints(rect).map((p) => rotate(p, shape.rotation, c));
}

function getMarkers(rect: IRectangle, center: IVec2): IVec2[] {
  return [
    { x: rect.x, y: rect.y },
    { x: center.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: center.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: center.x, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x, y: center.y },
  ];
}
