import {
  IVec2,
  MINVALUE,
  add,
  clamp,
  getDistance,
  getRadian,
  parsePathSegmentRaws,
  pathSegmentRawsToString,
} from "okageo";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import {
  TAU,
  expandRect,
  getClosestOutlineOnArc,
  getCrossLineAndArcRotated,
  getIntersectionBetweenCircles,
  getRotateFn,
  getRotatedRectAffine,
  getRotatedWrapperRectAt,
  isPointOnEllipseRotated,
  sortPointFrom,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { EllipseShape, struct as ellipseStruct } from "./ellipse";
import { applyRotatedRectTransformToRawPath, renderTransform } from "../utils/svgElements";

export type MoonShape = EllipseShape & {
  innsetC: IVec2;
  radiusRate: number;
};

export const struct: ShapeStruct<MoonShape> = {
  ...ellipseStruct,
  label: "Moon",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "moon",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      rx: arg.rx ?? 50,
      ry: arg.ry ?? 50,
      innsetC: arg.innsetC ?? { x: 0.5, y: 0.5 },
      radiusRate: arg.radiusRate ?? 1,
    };
  },
  render(ctx, shape) {
    if (shape.fill.disabled && shape.stroke.disabled) return;

    ctx.beginPath();
    applyMoonPath(ctx, shape);

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
    applyMoonPath(region, shape);
    return region;
  },
  createSVGElementInfo(shape) {
    const arcD = createMoonLocalSVGPathStr(shape);
    if (arcD === "ellipse") return ellipseStruct.createSVGElementInfo?.(shape);
    if (arcD === "none") return;

    const rect = {
      x: shape.p.x,
      y: shape.p.y,
      width: 2 * shape.rx,
      height: 2 * shape.ry,
    };
    const affine = getRotatedRectAffine(rect, shape.rotation);

    return {
      tag: "path",
      attributes: {
        d: arcD,
        transform: renderTransform(affine),
        ...renderFillSVGAttributes(shape.fill),
        ...renderStrokeSVGAttributes(shape.stroke),
      },
    };
  },
  createClipSVGPath(shape) {
    const arcD = createMoonLocalSVGPathStr(shape);
    if (arcD === "ellipse") return ellipseStruct.createClipSVGPath?.(shape);
    if (arcD === "none") return;

    const rawPath = parsePathSegmentRaws(arcD);
    const rect = {
      x: shape.p.x,
      y: shape.p.y,
      width: 2 * shape.rx,
      height: 2 * shape.ry,
    };
    return pathSegmentRawsToString(applyRotatedRectTransformToRawPath(rect, shape.rotation, rawPath));
  },
  getWrapperRect(shape, shapeContext, includeBounds) {
    if (!includeBounds) return ellipseStruct.getWrapperRect(shape, shapeContext, includeBounds);

    // Crop the bounds to the actual arc appearance.
    const ac = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
    const ar = shape.rx;
    const br = getMoonRadius(shape);
    const bc = { x: shape.p.x + getMoonInsetLocalX(shape) + br, y: ac.y };
    const intersections = getIntersectionBetweenCircles(ac, ar, bc, br);
    const intersection = intersections?.[0];

    const width = intersection ? Math.abs(intersection.x - shape.p.x) : shape.rx * 2;
    const height =
      intersection && width < shape.rx ? (Math.abs(intersection.y - ac.y) / shape.rx) * shape.ry * 2 : shape.ry * 2;
    const y = shape.p.y + (shape.ry - height / 2);
    let rect = { x: shape.p.x, y, width, height };
    rect = expandRect(rect, getStrokeWidth(shape.stroke) / 2);
    return getRotatedWrapperRectAt(rect, shape.rotation, ac);
  },
  isPointOn(shape, p) {
    const ac = add(shape.p, { x: shape.rx, y: shape.ry });
    const isOnEllipse = isPointOnEllipseRotated(ac, shape.rx, shape.ry, shape.rotation, p);
    if (!isOnEllipse) return false;

    const rotateFn = getRotateFn(shape.rotation, ac);
    const brx = getMoonRadius(shape);
    const bry = (brx / shape.rx) * shape.ry;
    const bc = rotateFn({ x: shape.p.x + getMoonInsetLocalX(shape) + brx, y: ac.y });
    return !isPointOnEllipseRotated(bc, brx, bry, shape.rotation, p);
  },
  getClosestOutline,
  getIntersectedOutlines(shape, from, to) {
    const r = { x: shape.rx, y: shape.ry };
    const ac = add(shape.p, r);
    const rotateFn = getRotateFn(shape.rotation, ac);
    const ar = shape.rx;
    const br = getMoonRadius(shape);
    const insetLocalX = getMoonInsetLocalX(shape);
    const bc = rotateFn({ x: shape.p.x + insetLocalX + br, y: ac.y });
    const moonIntersections = getIntersectionBetweenCircles(ac, ar, bc, br);
    if (!moonIntersections) {
      return ellipseStruct.getIntersectedOutlines?.(shape, from, to);
    }
    if (moonIntersections.length === 1) {
      if (Math.abs(insetLocalX) < MINVALUE) return;
      return ellipseStruct.getIntersectedOutlines?.(shape, from, to);
    }

    const intersections: IVec2[] = [];

    const [afrom, ato] = moonIntersections.map(
      (p) => getRadian({ x: (p.x - ac.x) * shape.rx, y: (p.y - ac.y) * shape.ry }) - shape.rotation,
    );
    getCrossLineAndArcRotated([from, to], ac, shape.rx, shape.ry, shape.rotation, ato, afrom)?.forEach((p) =>
      intersections.push(p),
    );

    const brx = br;
    const bry = (br / shape.rx) * shape.ry;
    const [bfrom, bto] = moonIntersections.map(
      (p) => getRadian({ x: (p.x - bc.x) * brx, y: (p.y - bc.y) * bry }) - shape.rotation,
    );
    getCrossLineAndArcRotated([from, to], bc, brx, bry, shape.rotation, bto, bfrom)?.forEach((p) =>
      intersections.push(p),
    );

    return intersections.length > 0 ? sortPointFrom(from, intersections) : undefined;
  },
  canAttachSmartBranch: false,
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getClosestOutline(shape: MoonShape, p: IVec2, threshold: number): IVec2 | undefined {
  const r = { x: shape.rx, y: shape.ry };
  const ac = add(shape.p, r);
  const ar = shape.rx;
  const br = getMoonRadius(shape);
  const insetLocalX = getMoonInsetLocalX(shape);
  const bc = { x: shape.p.x + insetLocalX + br, y: ac.y };
  const moonIntersections = getIntersectionBetweenCircles(ac, ar, bc, br);
  let moonIntersections2 = moonIntersections;

  if (!moonIntersections) {
    return ellipseStruct.getClosestOutline?.(shape, p, threshold);
  }
  if (moonIntersections.length === 1) {
    if (Math.abs(insetLocalX) < MINVALUE) return;
    if (Math.abs(insetLocalX - 2 * ar) < MINVALUE) return ellipseStruct.getClosestOutline?.(shape, p, threshold);

    // Duplicate the single intersection to make a hole.
    moonIntersections2 = [moonIntersections[0], moonIntersections[0]];
  }
  moonIntersections2 ??= moonIntersections;

  const rotateFn = getRotateFn(shape.rotation, ac);
  const rotatedP = rotateFn(p, true);
  const adjustedMoonIntersections = moonIntersections2.map((p) => ({
    x: p.x,
    y: ac.y + ((p.y - ac.y) / shape.rx) * shape.ry,
  }));

  {
    const markers = [{ x: bc.x - br, y: ac.y }, { x: shape.p.x, y: ac.y }, ...adjustedMoonIntersections];
    const rotatedClosest = markers.find((m) => getDistance(m, rotatedP) <= threshold);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }

  {
    const [afrom, ato] = moonIntersections2.map((p) => getRadian(p, ac));
    const rotatedClosest = getClosestOutlineOnArc(ac, shape.rx, shape.ry, ato, afrom, rotatedP, threshold);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }

  {
    const brx = br;
    const bry = (br / shape.rx) * shape.ry;
    const [bfrom, bto] = moonIntersections2.map((p) => getRadian(p, bc));
    const rotatedClosest = getClosestOutlineOnArc(bc, brx, bry, bto, bfrom, rotatedP, threshold);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }
}

export function getMoonInsetLocalX(shape: MoonShape): number {
  return 2 * shape.rx * clamp(0, 1, shape.innsetC.x);
}

export function getMoonRadius(shape: MoonShape): number {
  const range = getMoonRadiusRange(shape);
  return clamp(range[0], range[1], shape.rx * shape.radiusRate);
}

export function getMoonRadiusRange(shape: MoonShape): [min: number, max: number] {
  const insetX = getMoonInsetLocalX(shape);
  return [shape.rx - insetX / 2, 10 * shape.rx];
}

function applyMoonPath(ctx: CanvasRenderingContext2D | Path2D, shape: MoonShape) {
  const ac = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
  const rotateFn = getRotateFn(shape.rotation, ac);
  const ar = shape.rx;
  const br = getMoonRadius(shape);
  const insetLocalX = getMoonInsetLocalX(shape);
  const bc = rotateFn({ x: shape.p.x + insetLocalX + br, y: ac.y });
  const intersections = getIntersectionBetweenCircles(ac, ar, bc, br);

  if (!intersections) {
    ctx.ellipse(ac.x, ac.y, shape.rx, shape.ry, shape.rotation, 0, TAU);
  } else if (intersections.length === 1) {
    // Ignore when there's no visible part.
    if (Math.abs(insetLocalX) < MINVALUE) return;

    if (insetLocalX < shape.rx * 2) {
      ctx.ellipse(bc.x, bc.y, br, (br / shape.rx) * shape.ry, shape.rotation, 0, TAU, true);
    }
    ctx.ellipse(ac.x, ac.y, shape.rx, shape.ry, shape.rotation, 0, TAU);
  } else {
    const [bfrom, bto] = intersections.map((p) => getRadian(p, bc) - shape.rotation);
    ctx.ellipse(bc.x, bc.y, br, (br / shape.rx) * shape.ry, shape.rotation, bfrom, bto, true);
    const [afrom, ato] = intersections.map((p) => getRadian(p, ac) - shape.rotation);
    ctx.ellipse(ac.x, ac.y, shape.rx, shape.ry, shape.rotation, ato, afrom);
  }

  ctx.closePath();
}

function createMoonLocalSVGPathStr(shape: MoonShape): "ellipse" | "none" | string {
  const ac = { x: shape.rx, y: shape.ry };
  const ar = shape.rx;
  const br = getMoonRadius(shape);
  const insetLocalX = getMoonInsetLocalX(shape);
  const bc = { x: insetLocalX + br, y: ac.y };
  const moonIntersections = getIntersectionBetweenCircles(ac, ar, bc, br);
  let adjustedMoonIntersections = moonIntersections;

  if (!moonIntersections) return "ellipse";
  if (moonIntersections.length === 1) {
    // Ignore when there's no visible part.
    if (Math.abs(insetLocalX) < MINVALUE) return "none";

    // Duplicate the single intersection to make a hole.
    adjustedMoonIntersections = [moonIntersections[0], moonIntersections[0]];
  }
  if (!adjustedMoonIntersections) adjustedMoonIntersections = moonIntersections;

  const [aifrom, aito] = adjustedMoonIntersections.map((p) => ({
    x: p.x,
    y: ac.y + ((p.y - ac.y) / shape.rx) * shape.ry,
  }));
  const brx = br;
  const bry = (br / shape.rx) * shape.ry;
  return [
    `M${aifrom.x} ${aifrom.y}`,
    `A${brx} ${bry} 0 0 0 ${bc.x - br} ${bc.y}`,
    `A${brx} ${bry} 0 0 0 ${aito.x} ${aito.y}`,
    `A${shape.rx} ${shape.ry} 0 0 1 ${0} ${ac.y}`,
    `A${shape.rx} ${shape.ry} 0 0 1 ${aifrom.x} ${aifrom.y}z`,
  ].join(" ");
}
