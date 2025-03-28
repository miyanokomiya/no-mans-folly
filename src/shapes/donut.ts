import { IVec2, PathSegmentRaw, add, getDistance, isOnSeg, pathSegmentRawsToString, sub } from "okageo";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import {
  TAU,
  getClosestOutlineOnEllipse,
  getCrossLineAndEllipseRotated,
  getD2,
  getEllipseSlopeAt,
  getRotateFn,
  getRotatedRectAffine,
  isPointOnEllipseRotated,
  sortPointFrom,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { applyRotatedRectTransformToRawPath, renderTransform } from "../utils/svgElements";
import { EllipseShape, struct as ellipseStruct } from "./ellipse";
import { CanvasCTX } from "../utils/types";
import { covertEllipseToBezier } from "../utils/path";

export type DonutShape = EllipseShape & {
  holeRate: number;
};

export const struct: ShapeStruct<DonutShape> = {
  ...ellipseStruct,
  label: "Donut",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "donut",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      rx: arg.rx ?? 50,
      ry: arg.ry ?? 50,
      holeRate: arg.holeRate ?? 0.6,
    };
  },
  render(ctx, shape) {
    if (shape.fill.disabled && shape.stroke.disabled) return;

    ctx.beginPath();
    applyDonutPath(ctx, shape);

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
    const region = new Path2D();
    applyDonutPath(region, shape);
    return region;
  },
  createSVGElementInfo(shape) {
    const rect = {
      x: shape.p.x,
      y: shape.p.y,
      width: 2 * shape.rx,
      height: 2 * shape.ry,
    };
    const affine = getRotatedRectAffine(rect, shape.rotation);
    const d = pathSegmentRawsToString(createLocalSVGRawPath(shape));

    return {
      tag: "path",
      attributes: {
        d,
        transform: renderTransform(affine),
        ...renderFillSVGAttributes(shape.fill),
        ...renderStrokeSVGAttributes(shape.stroke),
      },
    };
  },
  createClipSVGPath(shape) {
    const rawPath = createLocalSVGRawPath(shape);
    const rect = {
      x: shape.p.x,
      y: shape.p.y,
      width: 2 * shape.rx,
      height: 2 * shape.ry,
    };
    return pathSegmentRawsToString(applyRotatedRectTransformToRawPath(rect, shape.rotation, rawPath));
  },
  isPointOn(shape, p) {
    const c = add(shape.p, { x: shape.rx, y: shape.ry });
    const isOnEllipse = isPointOnEllipseRotated(c, shape.rx, shape.ry, shape.rotation, p);
    if (!isOnEllipse) return false;

    const holeRate = shape.holeRate;
    return !isPointOnEllipseRotated(c, shape.rx * holeRate, shape.ry * holeRate, shape.rotation, p);
  },
  getClosestOutline,
  getIntersectedOutlines(shape, from, to) {
    const holeRate = shape.holeRate;
    const center = add(shape.p, { x: shape.rx, y: shape.ry });
    const outerPoints = getCrossLineAndEllipseRotated([from, to], center, shape.rx, shape.ry, shape.rotation);
    const innerPoints = getCrossLineAndEllipseRotated(
      [from, to],
      center,
      shape.rx * holeRate,
      shape.ry * holeRate,
      shape.rotation,
    );

    const points = [...(outerPoints ?? []), ...(innerPoints ?? [])].filter((p) => isOnSeg(p, [from, to]) ?? p);
    return points.length === 0 ? undefined : sortPointFrom(from, points);
  },
  getOutlinePaths(shape) {
    const holeRate = shape.holeRate;
    const c = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
    const outerEllipse = covertEllipseToBezier(c, shape.rx, shape.ry, shape.rotation, 0, TAU);
    const innerEllipse = covertEllipseToBezier(c, shape.rx * holeRate, shape.ry * holeRate, shape.rotation, 0, TAU);
    return [outerEllipse, innerEllipse];
  },
  getTangentAt(shape, p) {
    const r = { x: shape.rx, y: shape.ry };
    const center = add(shape.p, r);
    const holeRate = shape.holeRate;

    const rotateFn = getRotateFn(shape.rotation, center);
    const rotatedP = rotateFn(p, true);
    let rotatedClosest: [IVec2, number, rad: number] | undefined;

    {
      const candidate = getClosestOutlineOnEllipse(
        center,
        shape.rx,
        shape.ry,
        rotatedP,
        rotatedClosest?.[1] ?? Infinity,
      );
      if (candidate) {
        rotatedClosest = [
          candidate,
          getD2(sub(candidate, rotatedP)),
          getEllipseSlopeAt(center, shape.rx, shape.ry, candidate),
        ];
      }
    }

    if (holeRate) {
      const candidate = getClosestOutlineOnEllipse(
        center,
        shape.rx * holeRate,
        shape.ry * holeRate,
        rotatedP,
        rotatedClosest?.[1] ?? Infinity,
      );
      if (candidate) {
        rotatedClosest = [
          candidate,
          getD2(sub(candidate, rotatedP)),
          getEllipseSlopeAt(center, shape.rx, shape.ry, candidate),
        ];
      }
    }

    return (rotatedClosest?.[2] ?? 0) + shape.rotation;
  },
  canAttachSmartBranch: false,
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getMarkers(center: IVec2, rx: number, ry: number, holeRate: number): IVec2[] {
  const irx = rx * holeRate;
  const iry = ry * holeRate;

  return [
    { x: center.x, y: center.y - ry },
    { x: center.x + rx, y: center.y },
    { x: center.x, y: center.y + ry },
    { x: center.x - rx, y: center.y },

    { x: center.x, y: center.y - iry },
    { x: center.x + irx, y: center.y },
    { x: center.x, y: center.y + iry },
    { x: center.x - irx, y: center.y },
  ];
}

function getClosestOutline(
  shape: DonutShape,
  p: IVec2,
  threshold: number,
  thresholdForMarker = threshold,
): IVec2 | undefined {
  const center = add(shape.p, { x: shape.rx, y: shape.ry });
  const rotateFn = getRotateFn(shape.rotation, center);
  const rotatedP = rotateFn(p, true);
  const holeRate = shape.holeRate;

  {
    const markers = getMarkers(center, shape.rx, shape.ry, holeRate);
    const rotatedClosest = markers.find((m) => getDistance(m, rotatedP) <= thresholdForMarker);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }

  {
    const rotatedOuterClosest = getClosestOutlineOnEllipse(center, shape.rx, shape.ry, rotatedP, threshold);
    const rotatedInnerClosest = getClosestOutlineOnEllipse(
      center,
      shape.rx * holeRate,
      shape.ry * holeRate,
      rotatedP,
      threshold,
    );
    if (rotatedOuterClosest && rotatedInnerClosest) {
      return rotateFn(sortPointFrom(rotatedP, [rotatedOuterClosest, rotatedInnerClosest])[0]);
    } else if (rotatedOuterClosest) {
      return rotateFn(rotatedOuterClosest);
    } else if (rotatedInnerClosest) {
      return rotateFn(rotatedInnerClosest);
    }
  }
}

function applyDonutPath(ctx: CanvasCTX | Path2D, shape: DonutShape) {
  const holeRate = shape.holeRate;
  const c = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
  const rotateFn = getRotateFn(shape.rotation, c);
  const innerStartP = rotateFn({ x: c.x + shape.rx * holeRate, y: c.y });

  ctx.ellipse(c.x, c.y, shape.rx, shape.ry, shape.rotation, 0, TAU);
  ctx.moveTo(innerStartP.x, innerStartP.y);
  ctx.ellipse(c.x, c.y, shape.rx * holeRate, shape.ry * holeRate, shape.rotation, 0, TAU, true);
}

function createLocalSVGRawPath(shape: DonutShape): PathSegmentRaw[] {
  const rx = shape.rx;
  const ry = shape.ry;
  const c = { x: rx, y: ry };
  const holeRate = shape.holeRate;
  const irx = rx * holeRate;
  const iry = ry * holeRate;
  return [
    ["M", c.x + rx, c.y],
    ["A", rx, ry, 0, false, true, c.x - rx, c.y],
    ["A", rx, ry, 0, false, true, c.x + rx, c.y],
    ["z"],
    ["M", c.x + irx, c.y],
    ["A", irx, iry, 0, false, false, c.x - irx, c.y],
    ["A", irx, iry, 0, false, false, c.x + irx, c.y],
    ["z"],
  ];
}
