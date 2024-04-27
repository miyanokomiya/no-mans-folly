import { IVec2, MINVALUE, add, getCenter, getDistance, sub } from "okageo";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import {
  ISegment,
  TAU,
  expandRect,
  getClosestOutlineOnArc,
  getClosestPointOnSegment,
  getCrossLineAndArcRotated,
  getCrossSegAndSeg,
  getD2,
  getGeneralArcBounds,
  getRotateFn,
  getRotatedRectAffine,
  getRotatedWrapperRect,
  getWrapperRect,
  isPointOnArcRotated,
  sortPointFrom,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { renderTransform } from "../utils/svgElements";
import { EllipseShape, struct as ellipseStruct } from "./ellipse";
import { pickMinItem } from "../utils/commons";

export type ArcShape = EllipseShape & {
  // The arc is always drawn clockwisely "from" -> "to".
  from: number;
  to: number;
};

export const struct: ShapeStruct<ArcShape> = {
  ...ellipseStruct,
  label: "Arc",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "arc",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      rx: arg.rx ?? 50,
      ry: arg.ry ?? 50,
      from: arg.from ?? 0,
      to: arg.to ?? TAU / 4,
    };
  },
  render(ctx, shape) {
    if (shape.fill.disabled && shape.stroke.disabled) return;

    const c = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.ellipse(c.x, c.y, shape.rx, shape.ry, shape.rotation, shape.from, shape.to);
    ctx.closePath();

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
    const rect = {
      x: shape.p.x,
      y: shape.p.y,
      width: 2 * shape.rx,
      height: 2 * shape.ry,
    };
    const affine = getRotatedRectAffine(rect, shape.rotation);

    // "large" param depends on whether the arc has larger radian than pi.
    const large = (shape.to > shape.from ? shape.to : shape.to + TAU) - shape.from > Math.PI ? 1 : 0;
    return {
      tag: "path",
      attributes: {
        d: [
          `M${shape.rx} ${shape.ry}`,
          `L${shape.rx + Math.cos(shape.from) * shape.rx} ${shape.ry + Math.sin(shape.from) * shape.ry}`,
          `A${shape.rx} ${shape.ry} 0 ${large} 1 ${shape.rx + Math.cos(shape.to) * shape.rx} ${shape.ry + Math.sin(shape.to) * shape.ry}z`,
        ].join(" "),
        transform: renderTransform(affine),
        ...renderFillSVGAttributes(shape.fill),
        ...renderStrokeSVGAttributes(shape.stroke),
      },
    };
  },
  getWrapperRect(shape, shapeContext, includeBounds) {
    if (!includeBounds) return ellipseStruct.getWrapperRect(shape, shapeContext, includeBounds);

    // Crop the bounds to the actual arc appearance.
    const c = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
    const arcBounds = getGeneralArcBounds(c, shape.rx, shape.ry, shape.to, shape.from);
    let rect = getWrapperRect([arcBounds, { x: c.x, y: c.y, width: 0, height: 0 }]);
    rect = expandRect(rect, getStrokeWidth(shape.stroke) / 2);
    return getRotatedWrapperRect(rect, shape.rotation);
  },
  isPointOn(shape, p) {
    const c = add(shape.p, { x: shape.rx, y: shape.ry });
    return isPointOnArcRotated(c, shape.rx, shape.ry, shape.rotation, shape.from, shape.to, p);
  },
  getClosestOutline,
  getIntersectedOutlines(shape, from, to) {
    const r = { x: shape.rx, y: shape.ry };
    const center = add(shape.p, r);
    const intersections: IVec2[] = [];

    {
      const rotateFn = getRotateFn(shape.rotation, center);
      const localFrom = rotateFn(from, true);
      const localTo = rotateFn(to, true);
      const fromP = add(center, { x: r.x * Math.cos(shape.from), y: r.y * Math.sin(shape.from) });
      const toP = add(center, { x: r.x * Math.cos(shape.to), y: r.y * Math.sin(shape.to) });
      [
        [center, fromP],
        [center, toP],
      ].forEach((seg) => {
        const inter = getCrossSegAndSeg([localFrom, localTo], seg as ISegment);
        if (inter) intersections.push(rotateFn(inter));
      });
    }

    getCrossLineAndArcRotated([from, to], center, shape.rx, shape.ry, shape.rotation, shape.from, shape.to)?.forEach(
      (p) => intersections.push(p),
    );

    return intersections.length > 0 ? sortPointFrom(from, intersections) : undefined;
  },
  canAttachSmartBranch: false,
  // Prevent having text because text bounds is quite unstable depending on the form of the arc.
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getClosestOutline(shape: ArcShape, p: IVec2, threshold: number): IVec2 | undefined {
  const r = { x: shape.rx, y: shape.ry };
  const center = add(shape.p, r);
  const fromP = add(center, { x: r.x * Math.cos(shape.from), y: r.y * Math.sin(shape.from) });
  const toP = add(center, { x: r.x * Math.cos(shape.to), y: r.y * Math.sin(shape.to) });

  const rotateFn = getRotateFn(shape.rotation, center);
  const rotatedP = rotateFn(p, true);

  {
    const markers = [center, fromP, toP, getCenter(center, fromP), getCenter(center, toP)];
    const rotatedClosest = markers.find((m) => getDistance(m, rotatedP) <= threshold);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }

  {
    const points: IVec2[] = [];
    [
      [center, fromP],
      [center, toP],
    ].forEach((seg) => {
      points.push(getClosestPointOnSegment(seg, rotatedP));
    });
    const rotatedClosest = pickMinItem(points, (a) => getD2(sub(a, rotatedP)));
    if (rotatedClosest && getDistance(rotatedClosest, rotatedP) <= threshold) {
      return rotateFn(rotatedClosest);
    }
  }

  if (Math.abs(shape.from - shape.to) > MINVALUE) {
    const rotatedClosest = getClosestOutlineOnArc(
      center,
      shape.rx,
      shape.ry,
      shape.from,
      shape.to,
      rotatedP,
      threshold,
    );
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }
}
