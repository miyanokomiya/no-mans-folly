import { IVec2, add, getRadian, isSame } from "okageo";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import {
  TAU,
  expandRect,
  getCrossLineAndArcRotated,
  getIntersectionBetweenCircles,
  getRotateFn,
  getRotatedWrapperRect,
  isPointOnEllipseRotated,
  sortPointFrom,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { EllipseShape, struct as ellipseStruct } from "./ellipse";

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
    return undefined;
  },
  getWrapperRect(shape, shapeContext, includeBounds) {
    if (!includeBounds) return ellipseStruct.getWrapperRect(shape, shapeContext, includeBounds);

    // Crop the bounds to the actual arc appearance.
    const ac = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
    const rotateFn = getRotateFn(shape.rotation, ac);
    const ar = shape.rx;
    const br = shape.radiusRate * ar;
    const bc = rotateFn({ x: shape.p.x + getMoonInsetLocalX(shape) + br, y: ac.y });
    const intersections = getIntersectionBetweenCircles(ac, ar, bc, br);
    const intersection = intersections?.[0];

    const width = intersection ? Math.abs(intersection.x - shape.p.x) * 2 : shape.rx * 2;
    const height =
      intersection && width < shape.rx ? (Math.abs(intersection.y - ac.y) / shape.rx) * shape.ry * 2 : shape.ry * 2;
    const y = shape.p.y + (shape.ry - height / 2);
    let rect = { x: shape.p.x, y, width, height };
    rect = expandRect(rect, getStrokeWidth(shape.stroke) / 2);
    return getRotatedWrapperRect(rect, shape.rotation);
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
  return;
}

function getMoonInsetLocalX(shape: MoonShape): number {
  return 2 * shape.rx * shape.innsetC.x;
}
