import { IVec2, add, getRadian, isSame } from "okageo";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import {
  TAU,
  getIntersectionBetweenCircles,
  getRotateFn,
  getRotatedRectAffine,
  isPointOnEllipseRotated,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
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
      ctx.ellipse(bc.x, bc.y, shape.rx, shape.ry, shape.rotation, bfrom, bto, true);
      const [afrom, ato] = intersections.map((p) => getRadian(p, ac) - shape.rotation);
      ctx.ellipse(ac.x, ac.y, br, (br / shape.rx) * shape.ry, shape.rotation, ato, afrom);
    }

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
    if (true || !includeBounds) return ellipseStruct.getWrapperRect(shape, shapeContext, includeBounds);

    // Crop the bounds to the actual arc appearance.
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
    return [];
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
