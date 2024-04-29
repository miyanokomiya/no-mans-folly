import { IVec2, add, clamp, getDistance, getRadian, isSame } from "okageo";
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
import { renderTransform } from "../utils/svgElements";

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

    const ac = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
    const rotateFn = getRotateFn(shape.rotation, ac);
    const ar = shape.rx;
    const br = shape.radiusRate * ar;
    const bc = rotateFn({ x: shape.p.x + getMoonInsetLocalX(shape) + br, y: ac.y });
    const intersections = getIntersectionBetweenCircles(ac, ar, bc, br);
    let empty = false;

    ctx.beginPath();
    if (!intersections) {
      ctx.ellipse(ac.x, ac.y, shape.rx, shape.ry, shape.rotation, 0, TAU);
    } else if (intersections.length === 1) {
      empty = isSame(ac, bc);
      ctx.ellipse(ac.x, ac.y, shape.rx, shape.ry, shape.rotation, 0, TAU);
    } else {
      // intersections.map((p) => ({ x: p.x, y: (p.y / shape.rx) * shape.ry }));
      const [bfrom, bto] = intersections.map((p) => getRadian(p, bc) - shape.rotation);
      ctx.ellipse(bc.x, bc.y, br, (br / shape.rx) * shape.ry, shape.rotation, bfrom, bto, true);
      const [afrom, ato] = intersections.map((p) => getRadian(p, ac) - shape.rotation);
      ctx.ellipse(ac.x, ac.y, shape.rx, shape.ry, shape.rotation, ato, afrom);
    }

    ctx.closePath();

    if (!empty && !shape.fill.disabled) {
      applyFillStyle(ctx, shape.fill);
      ctx.fill();
    }
    if (!shape.stroke.disabled) {
      applyStrokeStyle(ctx, shape.stroke);
      ctx.stroke();
    }
  },
  createSVGElementInfo(shape) {
    const ac = { x: shape.rx, y: shape.ry };
    const ar = shape.rx;
    const br = shape.radiusRate * ar;
    const bc = { x: getMoonInsetLocalX(shape) + br, y: ac.y };
    const moonIntersections = getIntersectionBetweenCircles(ac, ar, bc, br);
    if (!moonIntersections || moonIntersections.length < 2) {
      const empty = moonIntersections?.length === 1 && isSame(ac, bc);
      return ellipseStruct.createSVGElementInfo?.(
        empty ? { ...shape, fill: { ...shape.fill, disabled: true } } : shape,
      );
    }

    const rect = {
      x: shape.p.x,
      y: shape.p.y,
      width: 2 * shape.rx,
      height: 2 * shape.ry,
    };
    const affine = getRotatedRectAffine(rect, shape.rotation);

    const [aifrom, aito] = moonIntersections.map((p) => ({
      x: p.x,
      y: ac.y + ((p.y - ac.y) / shape.rx) * shape.ry,
    }));
    const brx = br;
    const bry = (br / shape.rx) * shape.ry;
    const arcD = [
      `M${aifrom.x} ${aifrom.y}`,
      `A${shape.rx} ${shape.ry} 0 0 0 ${0} ${ac.y}`,
      `A${shape.rx} ${shape.ry} 0 0 0 ${aito.x} ${aito.y}`,
      `A${brx} ${bry} 0 0 1 ${bc.x - br} ${bc.y}`,
      `A${brx} ${bry} 0 0 1 ${aifrom.x} ${aifrom.y}z`,
    ].join(" ");

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
  getWrapperRect(shape, shapeContext, includeBounds) {
    if (!includeBounds) return ellipseStruct.getWrapperRect(shape, shapeContext, includeBounds);

    // Crop the bounds to the actual arc appearance.
    const ac = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
    const ar = shape.rx;
    const br = shape.radiusRate * ar;
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
    const brx = shape.radiusRate * shape.rx;
    const bry = shape.radiusRate * shape.ry;
    const bc = rotateFn({ x: shape.p.x + getMoonInsetLocalX(shape) + brx, y: ac.y });
    return !isPointOnEllipseRotated(bc, brx, bry, shape.rotation, p);
  },
  getClosestOutline,
  getIntersectedOutlines(shape, from, to) {
    const r = { x: shape.rx, y: shape.ry };
    const ac = add(shape.p, r);
    const rotateFn = getRotateFn(shape.rotation, ac);
    const ar = shape.rx;
    const br = shape.radiusRate * ar;
    const bc = rotateFn({ x: shape.p.x + getMoonInsetLocalX(shape) + br, y: ac.y });
    const moonIntersections = getIntersectionBetweenCircles(ac, ar, bc, br);
    if (!moonIntersections || moonIntersections.length < 2)
      return ellipseStruct.getIntersectedOutlines?.(shape, from, to);

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
  // Prevent having text because text bounds is quite unstable depending on the form of the arc.
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getClosestOutline(shape: MoonShape, p: IVec2, threshold: number): IVec2 | undefined {
  const r = { x: shape.rx, y: shape.ry };
  const ac = add(shape.p, r);
  const ar = shape.rx;
  const br = shape.radiusRate * ar;
  const bc = { x: shape.p.x + getMoonInsetLocalX(shape) + br, y: ac.y };
  const moonIntersections = getIntersectionBetweenCircles(ac, ar, bc, br);
  if (!moonIntersections || moonIntersections.length < 2) return ellipseStruct.getClosestOutline?.(shape, p, threshold);

  const rotateFn = getRotateFn(shape.rotation, ac);
  const rotatedP = rotateFn(p, true);
  const adjustedMoonIntersections = moonIntersections.map((p) => ({
    x: p.x,
    y: ac.y + ((p.y - ac.y) / shape.rx) * shape.ry,
  }));

  {
    const markers = [{ x: bc.x - br, y: ac.y }, { x: shape.p.x, y: ac.y }, ...adjustedMoonIntersections];
    const rotatedClosest = markers.find((m) => getDistance(m, rotatedP) <= threshold);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }

  {
    const [afrom, ato] = moonIntersections.map((p) => getRadian(p, ac));
    const rotatedClosest = getClosestOutlineOnArc(ac, shape.rx, shape.ry, ato, afrom, rotatedP, threshold);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }

  {
    const brx = br;
    const bry = (br / shape.rx) * shape.ry;
    const [bfrom, bto] = moonIntersections.map((p) => getRadian(p, bc));
    const rotatedClosest = getClosestOutlineOnArc(bc, brx, bry, bto, bfrom, rotatedP, threshold);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }
}

export function getMoonInsetLocalX(shape: MoonShape): number {
  return 2 * shape.rx * clamp(0, 1, shape.innsetC.x);
}
