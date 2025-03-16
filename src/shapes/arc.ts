import {
  IVec2,
  MINVALUE,
  PathSegmentRaw,
  add,
  clamp,
  getCenter,
  getDistance,
  getRadian,
  isOnSeg,
  multi,
  pathSegmentRawsToString,
  rotate,
  sub,
} from "okageo";
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
  getEllipseSlopeAt,
  getGeneralArcBounds,
  getRotateFn,
  getRotatedRectAffine,
  getRotatedWrapperRectAt,
  getWrapperRect,
  isOnDonutArc,
  sortPointFrom,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { applyRotatedRectTransformToRawPath, renderTransform } from "../utils/svgElements";
import { EllipseShape, struct as ellipseStruct } from "./ellipse";
import { pickMinItem } from "../utils/commons";
import { CanvasCTX } from "../utils/types";
import { covertEllipseToBezier } from "../utils/path";

export type ArcShape = EllipseShape & {
  // The arc is always drawn clockwisely "from" -> "to".
  // When "from" is equal to "to", the arc should become an ellipse rather than a line.
  // Both values should be within [-pi, pi].
  from: number;
  to: number;
  // should be 0 when undefined
  holeRate?: number;
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
      to: arg.to ?? -Math.PI / 2,
      holeRate: arg.holeRate ?? 0.5,
    };
  },
  render(ctx, shape) {
    if (shape.fill.disabled && shape.stroke.disabled) return;

    ctx.beginPath();
    applyShapePath(ctx, shape);

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
    applyShapePath(region, shape);
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
    const arcD = pathSegmentRawsToString(createLocalSVGRawPath(shape));

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
    const rect = {
      x: shape.p.x,
      y: shape.p.y,
      width: 2 * shape.rx,
      height: 2 * shape.ry,
    };
    const rawPath = createLocalSVGRawPath(shape);
    return pathSegmentRawsToString(applyRotatedRectTransformToRawPath(rect, shape.rotation, rawPath));
  },
  getWrapperRect(shape, shapeContext, includeBounds) {
    if (!includeBounds) return ellipseStruct.getWrapperRect(shape, shapeContext, includeBounds);

    // Crop the bounds to the actual arc appearance.
    const c = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
    const arcBounds = getGeneralArcBounds(c, shape.rx, shape.ry, shape.to, shape.from);
    let rect = getWrapperRect([arcBounds, { x: c.x, y: c.y, width: 0, height: 0 }]);
    rect = expandRect(rect, getStrokeWidth(shape.stroke) / 2);
    return getRotatedWrapperRectAt(rect, shape.rotation, c);
  },
  isPointOn(shape, p) {
    const c = add(shape.p, { x: shape.rx, y: shape.ry });
    return isOnDonutArc(c, shape.rx, shape.ry, shape.rotation, shape.from, shape.to, getHoleRate(shape), p);
  },
  getClosestOutline,
  getIntersectedOutlines(shape, from, to) {
    const r = { x: shape.rx, y: shape.ry };
    const center = add(shape.p, r);
    const holeRate = getHoleRate(shape);
    const intersections: IVec2[] = [];

    {
      const rotateFn = getRotateFn(shape.rotation, center);
      const localFrom = rotateFn(from, true);
      const localTo = rotateFn(to, true);
      const fromV = { x: r.x * Math.cos(shape.from), y: r.y * Math.sin(shape.from) };
      const toV = { x: r.x * Math.cos(shape.to), y: r.y * Math.sin(shape.to) };
      const fromP = add(center, fromV);
      const toP = add(center, toV);

      if (holeRate) {
        const ifromP = add(center, multi(toV, holeRate));
        const itoP = add(center, multi(fromV, holeRate));
        [
          [itoP, fromP],
          [toP, ifromP],
        ].forEach((seg) => {
          const inter = getCrossSegAndSeg([localFrom, localTo], seg as ISegment);
          if (inter) intersections.push(rotateFn(inter));
        });
      } else {
        [
          [center, fromP],
          [center, toP],
        ].forEach((seg) => {
          const inter = getCrossSegAndSeg([localFrom, localTo], seg as ISegment);
          if (inter) intersections.push(rotateFn(inter));
        });
      }
    }

    {
      const pushIfOnSeg = (p: IVec2) => (isOnSeg(p, [from, to]) ?? p) && intersections.push(p);

      if (holeRate) {
        getCrossLineAndArcRotated(
          [from, to],
          center,
          shape.rx * holeRate,
          shape.ry * holeRate,
          shape.rotation,
          shape.from,
          shape.to,
        )?.forEach(pushIfOnSeg);
      }

      getCrossLineAndArcRotated([from, to], center, shape.rx, shape.ry, shape.rotation, shape.from, shape.to)?.forEach(
        pushIfOnSeg,
      );
    }

    return intersections.length > 0 ? sortPointFrom(from, intersections) : undefined;
  },
  getOutlinePaths(shape) {
    const r = { x: shape.rx, y: shape.ry };
    const center = add(shape.p, r);
    const holeRate = getHoleRate(shape);
    const outerEllipse = covertEllipseToBezier(center, shape.rx, shape.ry, shape.rotation, shape.from, shape.to);

    if (!holeRate) {
      return [
        {
          path: [...outerEllipse.path, outerEllipse.path[0]],
          curves: outerEllipse.curves,
        },
      ];
    }

    const innerEllipse = covertEllipseToBezier(
      center,
      shape.rx * holeRate,
      shape.ry * holeRate,
      shape.rotation,
      shape.to,
      shape.from,
      true,
    );

    return [
      {
        path: [...outerEllipse.path, ...innerEllipse.path, outerEllipse.path[0]],
        curves: [...outerEllipse.curves, undefined, ...innerEllipse.curves, undefined],
      },
    ];
  },
  getTangentAt(shape, p) {
    if (Math.abs(shape.from - shape.to) <= MINVALUE) return shape.rotation;

    const r = { x: shape.rx, y: shape.ry };
    const center = add(shape.p, r);
    const holeRate = getHoleRate(shape);
    const fromV = { x: r.x * Math.cos(shape.from), y: r.y * Math.sin(shape.from) };
    const toV = { x: r.x * Math.cos(shape.to), y: r.y * Math.sin(shape.to) };
    const fromP = add(center, fromV);
    const toP = add(center, toV);
    const ifromP = add(center, multi(toV, holeRate));
    const itoP = add(center, multi(fromV, holeRate));

    const rotateFn = getRotateFn(shape.rotation, center);
    const rotatedP = rotateFn(p, true);
    let rotatedClosest: [IVec2, number, rad: number] | undefined;

    {
      const points: [IVec2, number, ISegment][] = [];
      (holeRate
        ? [
            [itoP, fromP],
            [toP, ifromP],
          ]
        : [
            [center, fromP],
            [center, toP],
          ]
      ).forEach((seg) => {
        const point = getClosestPointOnSegment(seg, rotatedP);
        points.push([point, getD2(sub(point, rotatedP)), seg as ISegment]);
      });
      const candidate = pickMinItem(points, (a) => a[1]);
      if (candidate) {
        rotatedClosest = [candidate[0], candidate[1], getRadian(candidate[2][1], candidate[2][0])];
      }
    }

    {
      const candidate = getClosestOutlineOnArc(
        center,
        shape.rx,
        shape.ry,
        shape.from,
        shape.to,
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
      const candidate = getClosestOutlineOnArc(
        center,
        shape.rx * holeRate,
        shape.ry * holeRate,
        shape.from,
        shape.to,
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
  // Prevent having text because text bounds is quite unstable depending on the form of the arc.
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getClosestOutline(
  shape: ArcShape,
  p: IVec2,
  threshold: number,
  thresholdForMarker = threshold,
): IVec2 | undefined {
  const r = { x: shape.rx, y: shape.ry };
  const center = add(shape.p, r);
  const holeRate = getHoleRate(shape);
  const fromV = { x: r.x * Math.cos(shape.from), y: r.y * Math.sin(shape.from) };
  const toV = { x: r.x * Math.cos(shape.to), y: r.y * Math.sin(shape.to) };
  const fromP = add(center, fromV);
  const toP = add(center, toV);
  const ifromP = add(center, multi(toV, holeRate));
  const itoP = add(center, multi(fromV, holeRate));

  const rotateFn = getRotateFn(shape.rotation, center);
  const rotatedP = rotateFn(p, true);

  {
    const markers = holeRate
      ? [fromP, toP, ifromP, itoP, getCenter(itoP, fromP), getCenter(ifromP, toP)]
      : [center, fromP, toP, getCenter(center, fromP), getCenter(center, toP)];
    const rotatedClosest = markers.find((m) => getDistance(m, rotatedP) <= thresholdForMarker);
    if (rotatedClosest) return rotateFn(rotatedClosest);
  }

  {
    const points: IVec2[] = [];
    (holeRate
      ? [
          [itoP, fromP],
          [toP, ifromP],
        ]
      : [
          [center, fromP],
          [center, toP],
        ]
    ).forEach((seg) => {
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

    if (holeRate) {
      const rotatedClosest = getClosestOutlineOnArc(
        center,
        shape.rx * holeRate,
        shape.ry * holeRate,
        shape.from,
        shape.to,
        rotatedP,
        threshold,
      );
      if (rotatedClosest) return rotateFn(rotatedClosest);
    }
  }
}

export function getHoleRate(shape: ArcShape): number {
  return clamp(0, 1, shape.holeRate ?? 0);
}

function getArcPoints(shape: ArcShape): [from: IVec2, to: IVec2] {
  return [
    { x: Math.cos(shape.from) * shape.rx, y: Math.sin(shape.from) * shape.ry },
    { x: Math.cos(shape.to) * shape.rx, y: Math.sin(shape.to) * shape.ry },
  ];
}

function applyShapePath(region: CanvasCTX | Path2D, shape: ArcShape) {
  const c = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
  const to = Math.abs(shape.from - shape.to) < MINVALUE ? shape.to + TAU : shape.to;

  const holeRate = getHoleRate(shape);
  if (holeRate) {
    const [startP] = getArcPoints(shape);
    const outerStartP = add(c, rotate(startP, shape.rotation));

    region.moveTo(outerStartP.x, outerStartP.y);
    region.ellipse(c.x, c.y, shape.rx, shape.ry, shape.rotation, shape.from, to);
    region.ellipse(c.x, c.y, shape.rx * holeRate, shape.ry * holeRate, shape.rotation, to, shape.from, true);
  } else {
    region.moveTo(c.x, c.y);
    region.ellipse(c.x, c.y, shape.rx, shape.ry, shape.rotation, shape.from, to);
  }

  region.closePath();
}

function createLocalSVGRawPath(shape: ArcShape): PathSegmentRaw[] {
  // "large" param depends on whether the arc has larger radian than pi.
  const large = (shape.to > shape.from ? shape.to : shape.to + TAU) - shape.from > Math.PI;
  // Drawing an ellipse requires two "A" commands.
  const isEllipse = Math.abs(shape.from - shape.to) < MINVALUE;
  const holeRate = getHoleRate(shape);
  const [startP, toP] = getArcPoints(shape);
  const c = { x: shape.rx, y: shape.ry };
  const outerStartP = add(c, startP);
  const outerToP = add(c, toP);
  const outerHalfP = add(c, rotate(startP, Math.PI));

  if (holeRate) {
    const innerStartP = add(c, multi(toP, holeRate));
    const innerToP = add(c, multi(startP, holeRate));
    const innerHalfP = add(c, rotate(multi(startP, holeRate), Math.PI));
    return [
      ["M", outerStartP.x, outerStartP.y],
      ...((isEllipse
        ? [
            ["A", shape.rx, shape.ry, 0, false, true, outerHalfP.x, outerHalfP.y],
            ["A", shape.rx, shape.ry, 0, false, true, outerStartP.x, outerStartP.y],
            ["L", innerStartP.x, innerStartP.y],
            ["A", shape.rx * holeRate, shape.ry * holeRate, 0, false, true, innerHalfP.x, innerHalfP.y],
            ["A", shape.rx * holeRate, shape.ry * holeRate, 0, false, true, innerStartP.x, innerStartP.y],
            ["z"],
          ]
        : [
            ["A", shape.rx, shape.ry, 0, large, true, outerToP.x, outerToP.y],
            ["L", innerStartP.x, innerStartP.y],
            ["A", shape.rx * holeRate, shape.ry * holeRate, 0, large, false, innerToP.x, innerToP.y],
            ["z"],
          ]) as PathSegmentRaw[]),
    ];
  } else {
    return [
      ["M", shape.rx, shape.ry],
      ["L", outerStartP.x, outerStartP.y],
      ...((isEllipse
        ? [
            ["A", shape.rx, shape.ry, 0, false, true, outerHalfP.x, outerHalfP.y],
            ["A", shape.rx, shape.ry, 0, false, true, outerStartP.x, outerStartP.y],
            ["z"],
          ]
        : [["A", shape.rx, shape.ry, 0, large, true, outerToP.x, outerToP.y], ["z"]]) as PathSegmentRaw[]),
    ];
  }
}
