import { describe, expect, test } from "vitest";
import {
  ISegment,
  expandRect,
  extendSegment,
  getClosestOutlineOnEllipse,
  getClosestOutlineOnRectangle,
  getClosestOutlineOnPolygon,
  getCrossLineAndEllipse,
  getCrossSegAndSeg,
  getIsRectHitRectFn,
  getLocationFromRateOnRectPath,
  getRectCenterLines,
  getRectLines,
  getRotatedRectAffine,
  getRectPoints,
  getRelativePointOnPath,
  getRotateFn,
  getRotatedWrapperRect,
  getWrapperRect,
  isPointCloseToSegment,
  isPointOnEllipse,
  isPointOnEllipseRotated,
  isPointOnRectangle,
  isPointOnRectangleRotated,
  isRectOverlappedH,
  isRectOverlappedV,
  isSegmentOverlappedH,
  isSegmentOverlappedV,
  sortPointFrom,
  getIntersectedOutlinesOnPolygon,
  getMarkersOnPolygon,
  snapNumberCeil,
  getDistanceBetweenPointAndRect,
  isPointCloseToBezierSpline,
  isPointCloseToBezierSegment,
  getSegments,
  getBezierMinValue,
  getBezierMaxValue,
  getBezierSplineBounds,
  getArcCurveParams,
  normalizeSegment,
  getArcLerpFn,
  getRelativePointOnCurvePath,
  getCurveLerpFn,
  normalizeRadian,
  getArcBounds,
} from "./geometry";
import { IRectangle } from "okageo";

describe("getRotateFn", () => {
  test("should return function to rotate", () => {
    const fn = getRotateFn(Math.PI / 2, { x: 10, y: 20 });
    expect(fn({ x: 20, y: 20 })).toEqual({
      x: 10,
      y: 30,
    });
    expect(fn({ x: 20, y: 20 }, true)).toEqual({
      x: 10,
      y: 10,
    });
  });
});

describe("normalizeRadian", () => {
  test("should return normalized radian", () => {
    expect(normalizeRadian(Math.PI * 1.5)).toBeCloseTo(-Math.PI * 0.5, 3);
    expect(normalizeRadian(Math.PI * 2.5)).toBeCloseTo(Math.PI * 0.5, 3);
    expect(normalizeRadian(-Math.PI * 1.5)).toBeCloseTo(Math.PI * 0.5, 3);
    expect(normalizeRadian(-Math.PI * 2.5)).toBeCloseTo(-Math.PI * 0.5, 3);
  });
});

describe("getSegments", () => {
  test("should return segment list", () => {
    expect(
      getSegments([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
    ]);
  });
});

describe("extendSegment", () => {
  test("should return extended segment", () => {
    expect(
      extendSegment(
        [
          { x: 10, y: 10 },
          { x: 20, y: 10 },
        ],
        2,
      ),
    ).toEqual([
      { x: 10, y: 10 },
      { x: 30, y: 10 },
    ]);
  });
});

describe("expandRect", () => {
  test("should return expanded rectangle", () => {
    expect(expandRect({ x: 1, y: 2, width: 10, height: 20 }, 5)).toEqual({
      x: -4,
      y: -3,
      width: 20,
      height: 30,
    });
  });
});

describe("isPointOnRectangle", () => {
  test("should return true if the point is on the rectangle", () => {
    expect(isPointOnRectangle({ x: 1, y: 2, width: 10, height: 20 }, { x: 0, y: 0 })).toBe(false);
    expect(isPointOnRectangle({ x: 1, y: 2, width: 10, height: 20 }, { x: 0, y: 5 })).toBe(false);
    expect(isPointOnRectangle({ x: 1, y: 2, width: 10, height: 20 }, { x: 5, y: 5 })).toBe(true);
    expect(isPointOnRectangle({ x: 1, y: 2, width: 10, height: 20 }, { x: 15, y: 5 })).toBe(false);
    expect(isPointOnRectangle({ x: 1, y: 2, width: 10, height: 20 }, { x: 5, y: 0 })).toBe(false);
    expect(isPointOnRectangle({ x: 1, y: 2, width: 10, height: 20 }, { x: 5, y: 25 })).toBe(false);
  });
});

describe("isPointOnRectangleRotated", () => {
  test("should return true if the point is on the rotated rectangle", () => {
    const rect = { x: 0, y: 0, width: 10, height: 20 };
    expect(isPointOnRectangleRotated(rect, 0, { x: 15, y: 10 })).toBe(false);
    expect(isPointOnRectangleRotated(rect, Math.PI / 2, { x: 15, y: 10 })).toBe(true);

    expect(isPointOnRectangleRotated(rect, 0, { x: 5, y: 0 })).toBe(true);
    expect(isPointOnRectangleRotated(rect, Math.PI / 2, { x: 5, y: 0 })).toBe(false);

    expect(isPointOnRectangleRotated(rect, 0, { x: 12, y: 10 })).toBe(false);
    expect(isPointOnRectangleRotated(rect, Math.PI / 4, { x: 12, y: 10 })).toBe(true);
  });
});

describe("getClosestOutlineOnRectangle", () => {
  test("should return the closest point on the rectangle outline", () => {
    const rect = { x: 0, y: 0, width: 10, height: 10 };
    expect(getClosestOutlineOnRectangle(rect, { x: -3, y: 4 }, 2)).toEqual(undefined);
    expect(getClosestOutlineOnRectangle(rect, { x: -1, y: 4 }, 2)).toEqual({ x: 0, y: 4 });
    expect(getClosestOutlineOnRectangle(rect, { x: 1, y: 4 }, 2)).toEqual({ x: 0, y: 4 });
    expect(getClosestOutlineOnRectangle(rect, { x: 3, y: 4 }, 2)).toEqual(undefined);

    expect(getClosestOutlineOnRectangle(rect, { x: 7, y: 4 }, 2)).toEqual(undefined);
    expect(getClosestOutlineOnRectangle(rect, { x: 9, y: 4 }, 2)).toEqual({ x: 10, y: 4 });
    expect(getClosestOutlineOnRectangle(rect, { x: 11, y: 4 }, 2)).toEqual({ x: 10, y: 4 });
    expect(getClosestOutlineOnRectangle(rect, { x: 13, y: 4 }, 2)).toEqual(undefined);

    expect(getClosestOutlineOnRectangle(rect, { y: -3, x: 4 }, 2)).toEqual(undefined);
    expect(getClosestOutlineOnRectangle(rect, { y: -1, x: 4 }, 2)).toEqual({ y: 0, x: 4 });
    expect(getClosestOutlineOnRectangle(rect, { y: 1, x: 4 }, 2)).toEqual({ y: 0, x: 4 });
    expect(getClosestOutlineOnRectangle(rect, { y: 3, x: 4 }, 2)).toEqual(undefined);

    expect(getClosestOutlineOnRectangle(rect, { y: 7, x: 4 }, 2)).toEqual(undefined);
    expect(getClosestOutlineOnRectangle(rect, { y: 9, x: 4 }, 2)).toEqual({ y: 10, x: 4 });
    expect(getClosestOutlineOnRectangle(rect, { y: 11, x: 4 }, 2)).toEqual({ y: 10, x: 4 });
    expect(getClosestOutlineOnRectangle(rect, { y: 13, x: 4 }, 2)).toEqual(undefined);

    expect(getClosestOutlineOnRectangle(rect, { x: 0.8, y: 1 }, 2)).toEqual({ x: 0, y: 1 });
    expect(getClosestOutlineOnRectangle(rect, { x: 1, y: 0.8 }, 2)).toEqual({ x: 1, y: 0 });
  });
});

describe("getClosestOutlineOnEllipse", () => {
  test("should return the closest outline point on the ellipse", () => {
    const r0 = getClosestOutlineOnEllipse({ x: 0, y: 0 }, 3, 4, { x: 4, y: 0 }, 2);
    expect(r0?.x).toBeCloseTo(3);
    expect(r0?.y).toBeCloseTo(0);

    const r1 = getClosestOutlineOnEllipse({ x: 0, y: 0 }, 3, 4, { x: 0, y: 3 }, 2);
    expect(r1?.x).toBeCloseTo(0);
    expect(r1?.y).toBeCloseTo(4);

    const r2 = getClosestOutlineOnEllipse({ x: 1, y: 1 }, 3, 3, { x: 4, y: 4 }, 2);
    expect(r2?.x).toBeCloseTo(1 + 3 / Math.SQRT2);
    expect(r2?.y).toBeCloseTo(1 + 3 / Math.SQRT2);

    const r3 = getClosestOutlineOnEllipse({ x: 0, y: 0 }, 3, 4, { x: 3, y: 3 }, 2);
    expect(r3?.x).toBeLessThan(3);
    expect(r3?.y).toBeLessThan(3);
  });
});

describe("getClosestOutlineOnPolygon", () => {
  test("should return the closest point on the polygon outline", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(getClosestOutlineOnPolygon(path, { x: -1, y: -1 }, 2)).toEqual(undefined);
    expect(getClosestOutlineOnPolygon(path, { x: 1, y: -1 }, 2)).toEqual({ x: 1, y: 0 });
    expect(getClosestOutlineOnPolygon(path, { x: 9, y: 10 }, 2)).toEqual({ x: 9.5, y: 9.5 });
  });
});

describe("getIntersectedOutlinesOnPolygon", () => {
  test("should return the intersected outlines of the polygon", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(getIntersectedOutlinesOnPolygon(path, { x: -3, y: 3 }, { x: -3, y: 13 })).toEqual(undefined);
    expect(getIntersectedOutlinesOnPolygon(path, { x: 3, y: -3 }, { x: 3, y: 13 })).toEqual([
      { x: 3, y: 0 },
      { x: 3, y: 10 },
    ]);
    expect(getIntersectedOutlinesOnPolygon(path, { x: 3, y: 3 }, { x: 3, y: 13 })).toEqual([{ x: 3, y: 10 }]);
  });
});

describe("getMarkersOnPolygon", () => {
  test("should return marker points on the polygon", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(getMarkersOnPolygon(path)).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 10, y: 10 },
      { x: 5, y: 5 },
    ]);
  });
});

describe("isPointOnEllipse", () => {
  test("should return true if the point is on the ellipse", () => {
    expect(isPointOnEllipse({ x: 0, y: 0 }, 3, 4, { x: -4, y: 0 })).toBe(false);
    expect(isPointOnEllipse({ x: 0, y: 0 }, 3, 4, { x: -2, y: 0 })).toBe(true);
    expect(isPointOnEllipse({ x: 0, y: 0 }, 3, 4, { x: 2, y: 0 })).toBe(true);
    expect(isPointOnEllipse({ x: 0, y: 0 }, 3, 4, { x: 4, y: 0 })).toBe(false);

    expect(isPointOnEllipse({ x: 0, y: 0 }, 3, 4, { x: 0, y: -5 })).toBe(false);
    expect(isPointOnEllipse({ x: 0, y: 0 }, 3, 4, { x: 0, y: -3 })).toBe(true);
    expect(isPointOnEllipse({ x: 0, y: 0 }, 3, 4, { x: 0, y: 3 })).toBe(true);
    expect(isPointOnEllipse({ x: 0, y: 0 }, 3, 4, { x: 0, y: 5 })).toBe(false);
  });
});

describe("isPointOnEllipseRotated", () => {
  test("should return true if the point is on the rotated ellipse", () => {
    expect(isPointOnEllipseRotated({ x: 0, y: 0 }, 3, 4, 0, { x: 4, y: 0 })).toBe(false);
    expect(isPointOnEllipseRotated({ x: 0, y: 0 }, 3, 4, Math.PI / 2, { x: 4, y: 0 })).toBe(true);

    expect(isPointOnEllipseRotated({ x: 0, y: 0 }, 3, 4, 0, { x: 0, y: 4 })).toBe(true);
    expect(isPointOnEllipseRotated({ x: 0, y: 0 }, 3, 4, Math.PI / 2, { x: 0, y: 4 })).toBe(false);

    expect(isPointOnEllipseRotated({ x: 0, y: 0 }, 3, 4, 0, { x: 3, y: -2 })).toBe(false);
    expect(isPointOnEllipseRotated({ x: 0, y: 0 }, 3, 4, Math.PI / 4, { x: 3, y: -2 })).toBe(true);
  });
});

describe("getCrossLineAndEllipse", () => {
  test("should return intersections if exist: when the line is vertical", () => {
    const res0 = getCrossLineAndEllipse(
      [
        { x: -1, y: 11 },
        { x: -1, y: 1 },
      ],
      { x: 1, y: 1 },
      3,
      4,
    );
    expect(res0?.[0].x).toBeCloseTo(-1);
    expect(res0?.[0].y).toBeGreaterThanOrEqual(-3);
    expect(res0?.[0].y).toBeLessThanOrEqual(5);
    expect(res0?.[1].x).toBeCloseTo(-1);
    expect(res0?.[1].y).toBeGreaterThanOrEqual(-3);
    expect(res0?.[1].y).toBeLessThanOrEqual(5);

    const res1 = getCrossLineAndEllipse(
      [
        { x: -4, y: 10 },
        { x: -4, y: 0 },
      ],
      { x: 0, y: 0 },
      3,
      4,
    );
    expect(res1).toBe(undefined);

    const res2 = getCrossLineAndEllipse(
      [
        { x: -3, y: 10 },
        { x: -3, y: 0 },
      ],
      { x: 0, y: 0 },
      3,
      4,
    );
    expect(res2).toHaveLength(1);
    expect(res2?.[0].x).toBeCloseTo(-3);
    expect(res2?.[0].y).toBeCloseTo(0);
  });

  test("should return intersections if exist: when the line isn't vertical", () => {
    const res0 = getCrossLineAndEllipse(
      [
        { x: -2, y: -3 },
        { x: 4, y: 5 },
      ],
      { x: 1, y: 1 },
      3,
      4,
    );
    expect(res0?.[0].x).toBeGreaterThanOrEqual(1.5);
    expect(res0?.[0].x).toBeLessThanOrEqual(4);
    expect(res0?.[0].y).toBeGreaterThanOrEqual(3);
    expect(res0?.[0].y).toBeLessThanOrEqual(5);
    expect(res0?.[1].x).toBeGreaterThanOrEqual(-2);
    expect(res0?.[1].x).toBeLessThanOrEqual(-0.5);
    expect(res0?.[1].y).toBeGreaterThanOrEqual(-3);
    expect(res0?.[1].y).toBeLessThanOrEqual(-1);

    const res1 = getCrossLineAndEllipse(
      [
        { x: 10, y: -3 },
        { x: 14, y: 5 },
      ],
      { x: 1, y: 1 },
      3,
      4,
    );
    expect(res1).toBe(undefined);
  });
});

describe("getWrapperRect", () => {
  test("should return a rectangle to wrap all rectangles", () => {
    expect(
      getWrapperRect([
        { x: 1, y: 2, width: 10, height: 20 },
        { x: 6, y: 7, width: 10, height: 22 },
      ]),
    ).toEqual({ x: 1, y: 2, width: 15, height: 27 });
    expect(
      getWrapperRect([
        { x: 1, y: 2, width: 10, height: 20 },
        { x: 6, y: 7, width: 4, height: 6 },
      ]),
    ).toEqual({ x: 1, y: 2, width: 10, height: 20 });
  });
});

describe("getRectPoints", () => {
  test("should return the path of the rectangle", () => {
    expect(getRectPoints({ x: 1, y: 2, width: 10, height: 20 })).toEqual([
      { x: 1, y: 2 },
      { x: 11, y: 2 },
      { x: 11, y: 22 },
      { x: 1, y: 22 },
    ]);
  });
});

describe("getRectLines", () => {
  test("should return the lines of the rectangle", () => {
    const p0 = { x: 1, y: 2 };
    const p1 = { x: 11, y: 2 };
    const p2 = { x: 11, y: 22 };
    const p3 = { x: 1, y: 22 };
    expect(getRectLines({ x: 1, y: 2, width: 10, height: 20 })).toEqual([
      [p0, p1],
      [p1, p2],
      [p2, p3],
      [p3, p0],
    ]);
  });
});

describe("getRectCenterLines", () => {
  test("should return the center lines of the rectangle", () => {
    expect(getRectCenterLines({ x: 1, y: 2, width: 10, height: 20 })).toEqual([
      [
        { x: 6, y: 2 },
        { x: 6, y: 22 },
      ],
      [
        { x: 1, y: 12 },
        { x: 11, y: 12 },
      ],
    ]);
  });
});

describe("getRotatedWrapperRect", () => {
  test("should return a rectangle to wrap rotated rectangle", () => {
    expect(getRotatedWrapperRect({ x: 1, y: 2, width: 10, height: 20 }, 0)).toEqual({
      x: 1,
      y: 2,
      width: 10,
      height: 20,
    });

    const res1 = getRotatedWrapperRect({ x: 0, y: 0, width: 10, height: 20 }, Math.PI / 2);
    expect(res1.x).toBeCloseTo(-5);
    expect(res1.y).toBeCloseTo(5);
    expect(res1.width).toBeCloseTo(20);
    expect(res1.height).toBeCloseTo(10);
  });
});

describe("isPointCloseToSegment", () => {
  test("should return true if the point is close to the segment", () => {
    const seg = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(isPointCloseToSegment(seg, { x: 3, y: 1 }, 1)).toBe(false);
    expect(isPointCloseToSegment(seg, { x: 2, y: 1 }, 1)).toBe(true);
    expect(isPointCloseToSegment(seg, { x: -0.1, y: -0.1 }, 1)).toBe(false);
  });
});

describe("isPointCloseToBezierSpline", () => {
  test("should return true if the point is close to the bezier spline", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const controls = [
      { c1: { x: 2.5, y: -5 }, c2: { x: 7.5, y: -5 } },
      { c1: { x: 15, y: 2.5 }, c2: { x: 15, y: 7.5 } },
    ];
    expect(isPointCloseToBezierSpline(points, controls, { x: 0, y: 0.1 }, 1)).toBe(false);
    expect(isPointCloseToBezierSpline(points, controls, { x: 0.1, y: -2 }, 1)).toBe(true);
    expect(isPointCloseToBezierSpline(points, controls, { x: 0.1, y: -6 }, 1)).toBe(false);
    expect(isPointCloseToBezierSpline(points, controls, { x: 12, y: 9 }, 1)).toBe(true);
    expect(isPointCloseToBezierSpline(points, controls, { x: 16, y: 10 }, 1)).toBe(false);
  });
});

describe("isPointCloseToBezierSegment", () => {
  test("should return true if the point is close to the bezier segment", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const controls = [{ c1: { x: 2.5, y: -5 }, c2: { x: 7.5, y: -5 } }];
    expect(isPointCloseToBezierSegment(points[0], points[1], controls[0].c1, controls[0].c2, { x: 0, y: 0.1 }, 1)).toBe(
      false,
    );
    expect(
      isPointCloseToBezierSegment(points[0], points[1], controls[0].c1, controls[0].c2, { x: 0.1, y: -2 }, 1),
    ).toBe(true);
    expect(
      isPointCloseToBezierSegment(points[0], points[1], controls[0].c1, controls[0].c2, { x: 0.1, y: -6 }, 1),
    ).toBe(false);
  });
});

describe("snapNumberCeil", () => {
  test("should return snapped number due ceil rule", () => {
    expect(snapNumberCeil(-5, 5)).toBe(-5);
    expect(snapNumberCeil(-1, 5)).toBeCloseTo(0);
    expect(snapNumberCeil(0, 5)).toBe(0);
    expect(snapNumberCeil(1, 5)).toBe(5);
    expect(snapNumberCeil(5, 5)).toBe(5);
    expect(snapNumberCeil(5.1, 5)).toBe(10);
  });
});

describe("isSegmentOverlappedV", () => {
  test("should return true if segments overlap vertically", () => {
    const seg: ISegment = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(isSegmentOverlappedV(seg, seg)).toBe(true);
    expect(
      isSegmentOverlappedV(seg, [
        { x: -10, y: 0 },
        { x: -1, y: 0 },
      ]),
    ).toBe(false);
    expect(
      isSegmentOverlappedV(seg, [
        { x: -10, y: 0 },
        { x: 1, y: 0 },
      ]),
    ).toBe(true);
    expect(
      isSegmentOverlappedV(seg, [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ]),
    ).toBe(true);
    expect(
      isSegmentOverlappedV(seg, [
        { x: 9, y: 0 },
        { x: 11, y: 0 },
      ]),
    ).toBe(true);
    expect(
      isSegmentOverlappedV(seg, [
        { x: 11, y: 0 },
        { x: 12, y: 0 },
      ]),
    ).toBe(false);
    expect(
      isSegmentOverlappedV(seg, [
        { x: 11, y: 0 },
        { x: 9, y: 0 },
      ]),
    ).toBe(true);
  });
});

describe("isSegmentOverlappedH", () => {
  test("should return true if segments overlap horizontally", () => {
    const seg: ISegment = [
      { y: 0, x: 0 },
      { y: 10, x: 0 },
    ];
    expect(isSegmentOverlappedH(seg, seg)).toBe(true);
    expect(
      isSegmentOverlappedH(seg, [
        { y: -10, x: 0 },
        { y: -1, x: 0 },
      ]),
    ).toBe(false);
    expect(
      isSegmentOverlappedH(seg, [
        { y: -10, x: 0 },
        { y: 1, x: 0 },
      ]),
    ).toBe(true);
    expect(
      isSegmentOverlappedH(seg, [
        { y: 1, x: 0 },
        { y: 9, x: 0 },
      ]),
    ).toBe(true);
    expect(
      isSegmentOverlappedH(seg, [
        { y: 9, x: 0 },
        { y: 11, x: 0 },
      ]),
    ).toBe(true);
    expect(
      isSegmentOverlappedH(seg, [
        { y: 11, x: 0 },
        { y: 12, x: 0 },
      ]),
    ).toBe(false);
    expect(
      isSegmentOverlappedH(seg, [
        { y: 11, x: 0 },
        { y: 9, x: 0 },
      ]),
    ).toBe(true);
  });
});

describe("isRectOverlappedH", () => {
  test("should return true if rectangles overlap horizontally", () => {
    const rect: IRectangle = { x: 0, y: 0, width: 100, height: 100 };
    expect(isRectOverlappedH(rect, rect)).toBe(true);
    expect(isRectOverlappedH(rect, { x: 0, y: 10, width: 100, height: 100 })).toBe(true);
    expect(isRectOverlappedH(rect, { x: 0, y: -10, width: 100, height: 100 })).toBe(true);
    expect(isRectOverlappedH(rect, { x: 0, y: 10, width: 100, height: 80 })).toBe(true);
    expect(isRectOverlappedH(rect, { x: 0, y: 110, width: 100, height: 100 })).toBe(false);
    expect(isRectOverlappedH(rect, { x: 0, y: -110, width: 100, height: 100 })).toBe(false);
  });
});

describe("isRectOverlappedV", () => {
  test("should return true if rectangles overlap vertically", () => {
    const rect: IRectangle = { x: 0, y: 0, width: 100, height: 100 };
    expect(isRectOverlappedV(rect, rect)).toBe(true);
    expect(isRectOverlappedV(rect, { x: 10, y: 0, width: 100, height: 100 })).toBe(true);
    expect(isRectOverlappedV(rect, { x: -10, y: 0, width: 100, height: 100 })).toBe(true);
    expect(isRectOverlappedV(rect, { x: 10, y: 0, width: 80, height: 100 })).toBe(true);
    expect(isRectOverlappedV(rect, { x: 110, y: 0, width: 100, height: 100 })).toBe(false);
    expect(isRectOverlappedV(rect, { x: -110, y: 0, width: 100, height: 100 })).toBe(false);
  });
});

describe("getCrossSegAndSeg", () => {
  test("should return intersection of two segments", () => {
    expect(
      getCrossSegAndSeg(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        [
          { x: 3, y: -3 },
          { x: 3, y: 5 },
        ],
      ),
    ).toEqual({ x: 3, y: 0 });
    expect(
      getCrossSegAndSeg(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        [
          { x: 3, y: 3 },
          { x: 3, y: 5 },
        ],
      ),
    ).toEqual(undefined);
  });
});

describe("sortPointFrom", () => {
  test("should return sorted points", () => {
    expect(
      sortPointFrom({ x: 10, y: 10 }, [
        { x: 11, y: 0 },
        { x: 12, y: 12 },
        { x: 0, y: 10 },
      ]),
    ).toEqual([
      { x: 12, y: 12 },
      { x: 0, y: 10 },
      { x: 11, y: 0 },
    ]);
  });
});

describe("getLocationFromRateOnRectPath", () => {
  test("should return the point at the rate", () => {
    const rect0 = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(getLocationFromRateOnRectPath(rect0, 0, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(getLocationFromRateOnRectPath(rect0, 0, { x: 1, y: 0 })).toEqual({ x: 100, y: 0 });
    expect(getLocationFromRateOnRectPath(rect0, 0, { x: 0.3, y: 0.8 })).toEqual({ x: 30, y: 80 });

    const rect1 = [
      { x: 50, y: -50 * Math.SQRT2 },
      { x: 50 + 50 * Math.SQRT2, y: 50 },
      { x: 50, y: 50 + 50 * Math.SQRT2 },
      { x: 50 - 50 * Math.SQRT2, y: 50 },
    ];
    const rotated0 = getLocationFromRateOnRectPath(rect1, Math.PI / 4, { x: 0, y: 0 });
    expect(rotated0.x).toBeCloseTo(50);
    expect(rotated0.y).toBeCloseTo(-50 * Math.SQRT2);
    const rotated1 = getLocationFromRateOnRectPath(rect1, Math.PI / 4, { x: 1, y: 1 });
    expect(rotated1.x).toBeCloseTo(50);
    expect(rotated1.y).toBeCloseTo(50 + 50 * Math.SQRT2);
  });
});

describe("getIsRectHitRectFn", () => {
  const isRectHitRect = getIsRectHitRectFn({
    x: 0,
    y: 0,
    width: 10,
    height: 20,
  });
  test("should return true if target hits the range", () => {
    expect(isRectHitRect({ x: -1, y: -1, width: 2, height: 40 })).toBe(true);
    expect(isRectHitRect({ x: 1, y: -1, width: 40, height: 40 })).toBe(true);
  });
  test("should return false if target does not hit the range", () => {
    expect(isRectHitRect({ x: -2, y: 1, width: 1, height: 20 })).toBe(false);
    expect(isRectHitRect({ x: 11, y: 1, width: 1, height: 20 })).toBe(false);
    expect(isRectHitRect({ x: 1, y: -2, width: 20, height: 1 })).toBe(false);
    expect(isRectHitRect({ x: 1, y: 21, width: 20, height: 1 })).toBe(false);
  });
});

describe("getRelativePointOnPath", () => {
  test("should return relative point on the path", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(getRelativePointOnPath(path, 0)).toEqual({ x: 0, y: 0 });
    expect(getRelativePointOnPath(path, 0.2)).toEqual({ x: 6, y: 0 });
    expect(getRelativePointOnPath(path, 0.5)).toEqual({ x: 10, y: 5 });
    expect(getRelativePointOnPath(path, 0.8)).toEqual({ x: 6, y: 10 });
    expect(getRelativePointOnPath(path, 1)).toEqual({ x: 0, y: 10 });
  });
});

describe("getRelativePointOnCurvePath", () => {
  test("should return relative point on the path: bezier curves", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const controls = [
      { c1: { x: 2, y: -5 }, c2: { x: 8, y: -5 } },
      { c1: { x: 15, y: 2 }, c2: { x: 15, y: 8 } },
    ];
    const ret0 = getRelativePointOnCurvePath(path, controls, 0);
    expect(ret0.x).toBeCloseTo(0, 3);
    expect(ret0.y).toBeCloseTo(0, 3);
    const ret10 = getRelativePointOnCurvePath(path, controls, 0.1);
    expect(ret10.x).toBeCloseTo(1.616, 3);
    expect(ret10.y).toBeCloseTo(-2.4, 3);
    const ret50 = getRelativePointOnCurvePath(path, controls, 0.5);
    expect(ret50.x).toBeCloseTo(10, 3);
    expect(ret50.y).toBeCloseTo(0, 3);
    const ret90 = getRelativePointOnCurvePath(path, controls, 0.9);
    expect(ret90.x).toBeCloseTo(12.4, 3);
    expect(ret90.y).toBeCloseTo(8.384, 3);
    const ret100 = getRelativePointOnCurvePath(path, controls, 1);
    expect(ret100.x).toBeCloseTo(10, 3);
    expect(ret100.y).toBeCloseTo(10, 3);
  });

  test("should return relative point on the path: arc curves", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const controls = [{ d: { x: 5, y: 5 } }];
    const ret0 = getRelativePointOnCurvePath(path, controls, 0);
    expect(ret0.x).toBeCloseTo(0, 3);
    expect(ret0.y).toBeCloseTo(0, 3);
    const ret10 = getRelativePointOnCurvePath(path, controls, 0.1);
    expect(ret10.x).toBeCloseTo(0.245, 3);
    expect(ret10.y).toBeCloseTo(1.545, 3);
    const ret50 = getRelativePointOnCurvePath(path, controls, 0.5);
    expect(ret50.x).toBeCloseTo(5, 3);
    expect(ret50.y).toBeCloseTo(5, 3);
    const ret90 = getRelativePointOnCurvePath(path, controls, 0.9);
    expect(ret90.x).toBeCloseTo(9.755, 3);
    expect(ret90.y).toBeCloseTo(1.545, 3);
    const ret100 = getRelativePointOnCurvePath(path, controls, 1);
    expect(ret100.x).toBeCloseTo(10, 3);
    expect(ret100.y).toBeCloseTo(0, 3);
  });

  test("should return relative point on the path: straight lines", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const ret0 = getRelativePointOnCurvePath(path, undefined, 0);
    expect(ret0.x).toBeCloseTo(0, 3);
    expect(ret0.y).toBeCloseTo(0, 3);
    const ret10 = getRelativePointOnCurvePath(path, undefined, 0.1);
    expect(ret10.x).toBeCloseTo(2, 3);
    expect(ret10.y).toBeCloseTo(0, 3);
    const ret90 = getRelativePointOnCurvePath(path, [], 0.9);
    expect(ret90.x).toBeCloseTo(10, 3);
    expect(ret90.y).toBeCloseTo(8, 3);
    const ret100 = getRelativePointOnCurvePath(path, [], 1);
    expect(ret100.x).toBeCloseTo(10, 3);
    expect(ret100.y).toBeCloseTo(10, 3);
  });
});

describe("getRotatedRectAffine", () => {
  test("should return relative point on the path", () => {
    expect(getRotatedRectAffine({ x: 100, y: 200, width: 10, height: 20 }, 0)).toEqual([1, 0, 0, 1, 100, 200]);

    const result1 = getRotatedRectAffine({ x: 0, y: 0, width: 10, height: 20 }, Math.PI / 2);
    expect(result1[0]).toBeCloseTo(0);
    expect(result1[1]).toBeCloseTo(1);
    expect(result1[2]).toBeCloseTo(-1);
    expect(result1[3]).toBeCloseTo(0);
    expect(result1[4]).toBeCloseTo(15);
    expect(result1[5]).toBeCloseTo(5);
  });
});

describe("measurePointAndRect", () => {
  test("should return squared distance between a point and a rectangle", () => {
    const rect = { x: 0, y: 0, width: 100, height: 50 };

    // Outside the rect
    expect(getDistanceBetweenPointAndRect({ x: -10, y: -10 }, rect)).toBeCloseTo(Math.sqrt(200));
    expect(getDistanceBetweenPointAndRect({ x: 10, y: -20 }, rect)).toBeCloseTo(20);
    expect(getDistanceBetweenPointAndRect({ x: 110, y: -10 }, rect)).toBeCloseTo(Math.sqrt(200));
    expect(getDistanceBetweenPointAndRect({ x: 120, y: 10 }, rect)).toBeCloseTo(20);
    expect(getDistanceBetweenPointAndRect({ x: 110, y: 60 }, rect)).toBeCloseTo(Math.sqrt(200));
    expect(getDistanceBetweenPointAndRect({ x: 90, y: 60 }, rect)).toBeCloseTo(10);
    expect(getDistanceBetweenPointAndRect({ x: -10, y: 60 }, rect)).toBeCloseTo(Math.sqrt(200));
    expect(getDistanceBetweenPointAndRect({ x: -10, y: 40 }, rect)).toBeCloseTo(10);

    // Inside the rect
    expect(getDistanceBetweenPointAndRect({ x: 10, y: 20 }, rect)).toBeCloseTo(0);
  });
});

describe("getBezierSplineBounds", () => {
  test("should return the bounds of the bezier spline", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const controls = [
      { c1: { x: 2.5, y: -5 }, c2: { x: 7.5, y: -5 } },
      { c1: { x: 15, y: 2.5 }, c2: { x: 15, y: 7.5 } },
    ];
    const ret0 = getBezierSplineBounds(points, controls);
    expect(ret0.x).toBeCloseTo(0, 3);
    expect(ret0.y).toBeCloseTo(-3.75, 3);
    expect(ret0.width).toBeCloseTo(13.75, 3);
    expect(ret0.height).toBeCloseTo(13.75, 3);
  });
});

describe("getBezierMinValue", () => {
  test("should return minimum value on the supplied cubic bezier", () => {
    expect(getBezierMinValue(0, 10, 2, 8)).toBeCloseTo(0, 3);
    expect(getBezierMinValue(0, 0, -10, -10)).toBeCloseTo(-7.5, 3);
    expect(getBezierMinValue(10, 10, 0, 0)).toBeCloseTo(10 - 7.5, 3);
  });
});

describe("getBezierMaxValue", () => {
  test("should return maximum value on the supplied cubic bezier", () => {
    expect(getBezierMaxValue(0, 10, 2, 8)).toBeCloseTo(10, 3);
    expect(getBezierMaxValue(0, 0, 10, 10)).toBeCloseTo(7.5, 3);
    expect(getBezierMaxValue(10, 10, 20, 20)).toBeCloseTo(17.5, 3);
  });
});

describe("getArcCurveParams", () => {
  test("should return arc curve params based on given segment and control point: no rotation", () => {
    const segment = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ] as ISegment;

    const ret0 = getArcCurveParams(segment, { x: 0, y: 50 })!;
    expect(ret0.c.x).toBeCloseTo(50, 3);
    expect(ret0.c.y).toBeCloseTo(0, 3);
    expect(ret0.radius).toBeCloseTo(50, 3);
    expect(Math.abs(ret0.from)).toBeCloseTo(Math.PI, 3);
    expect(ret0.to).toBeCloseTo(0, 3);

    const ret1 = getArcCurveParams(segment, { x: 0, y: 75 })!;
    expect(ret1.c.x).toBeCloseTo(50, 3);
    expect(ret1.c.y).toBeCloseTo(28.846, 3);
    expect(ret1.radius).toBeCloseTo(46.154, 3);
    expect(ret1.from).toBeCloseTo(-2.618, 3);
    expect(ret1.to).toBeCloseTo(-0.523, 3);
    expect(ret1.counterclockwise).toBe(true);
    expect(ret1.largearc).toBe(true);

    const ret2 = getArcCurveParams(segment, { x: 0, y: -75 })!;
    expect(ret2.c.x).toBeCloseTo(50, 3);
    expect(ret2.c.y).toBeCloseTo(-28.846, 3);
    expect(ret2.radius).toBeCloseTo(46.154, 3);
    expect(ret2.from).toBeCloseTo(2.618, 3);
    expect(ret2.to).toBeCloseTo(0.523, 3);
    expect(ret2.counterclockwise).toBe(false);
    expect(ret2.largearc).toBe(true);

    const ret3 = getArcCurveParams(segment, { x: 0, y: 25 })!;
    expect(ret3.c.x).toBeCloseTo(50, 3);
    expect(ret3.c.y).toBeCloseTo(-15, 3);
    expect(ret3.radius).toBeCloseTo(40, 3);
    expect(ret3.from).toBeCloseTo(2.85, 3);
    expect(ret3.to).toBeCloseTo(0.291, 3);
    expect(ret3.counterclockwise).toBe(true);
    expect(ret3.largearc).toBe(false);

    const ret4 = getArcCurveParams(segment, { x: 0, y: -25 })!;
    expect(ret4.c.x).toBeCloseTo(50, 3);
    expect(ret4.c.y).toBeCloseTo(15, 3);
    expect(ret4.radius).toBeCloseTo(40, 3);
    expect(ret4.from).toBeCloseTo(-2.85, 3);
    expect(ret4.to).toBeCloseTo(-0.291, 3);
    expect(ret4.counterclockwise).toBe(false);
    expect(ret4.largearc).toBe(false);
  });

  test("should return arc curve params based on given segment and control point: rotated segment", () => {
    const segment = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ] as ISegment;

    const ret0 = getArcCurveParams(segment, { x: -50, y: 0 })!;
    expect(ret0.c.x).toBeCloseTo(0, 3);
    expect(ret0.c.y).toBeCloseTo(50, 3);
    expect(ret0.radius).toBeCloseTo(50, 3);
    expect(ret0.from).toBeCloseTo(-Math.PI / 2, 3);
    expect(ret0.to).toBeCloseTo(Math.PI / 2, 3);

    const ret1 = getArcCurveParams(segment, { x: -75, y: 0 })!;
    expect(ret1.counterclockwise).toBe(true);

    const ret2 = getArcCurveParams(segment, { x: 75, y: 0 })!;
    expect(ret2.counterclockwise).toBe(false);
  });

  test("should return undefined if there's no appropriate arc", () => {
    expect(
      getArcCurveParams(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        { x: 50, y: 0 },
      ),
    ).toBe(undefined);
    expect(
      getArcCurveParams(
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        { x: 50, y: 50 },
      ),
    ).toBe(undefined);
  });
});

describe("normalizeSegment", () => {
  test("should return normalized segment", () => {
    const ret0 = normalizeSegment([
      { x: 10, y: 20 },
      { x: 10, y: 40 },
    ]);
    expect(ret0[0].x).toBeCloseTo(0, 3);
    expect(ret0[0].y).toBeCloseTo(0, 3);
    expect(ret0[1].x).toBeCloseTo(20, 3);
    expect(ret0[1].y).toBeCloseTo(0, 3);
  });
});

describe("getCircleLerpFn", () => {
  test("should return lerp function for a circule", () => {
    const ret0 = getArcLerpFn({ c: { x: 10, y: 20 }, radius: 5, from: 0, to: Math.PI / 2 });
    expect(ret0(0).x).toBeCloseTo(15, 3);
    expect(ret0(0).y).toBeCloseTo(20, 3);
    expect(ret0(0.5).x).toBeCloseTo(13.536, 3);
    expect(ret0(0.5).y).toBeCloseTo(23.536, 3);
    expect(ret0(1).x).toBeCloseTo(10, 3);
    expect(ret0(1).y).toBeCloseTo(25, 3);

    const ret1 = getArcLerpFn({ c: { x: 10, y: 20 }, radius: 5, from: 0, to: -Math.PI * 1.5 });
    expect(ret1(0.5).x).toBeCloseTo(13.536, 3);
    expect(ret1(0.5).y).toBeCloseTo(23.536, 3);
  });

  test("should return lerp function for a circule: counterclockwise", () => {
    const ret0 = getArcLerpFn({ c: { x: 10, y: 20 }, radius: 5, from: 0, to: Math.PI / 2, counterclockwise: true });
    expect(ret0(0).x).toBeCloseTo(15, 3);
    expect(ret0(0).y).toBeCloseTo(20, 3);
    expect(ret0(0.5).x).toBeCloseTo(6.464, 3);
    expect(ret0(0.5).y).toBeCloseTo(16.464, 3);
    expect(ret0(1).x).toBeCloseTo(10, 3);
    expect(ret0(1).y).toBeCloseTo(25, 3);

    const ret1 = getArcLerpFn({
      c: { x: 10, y: 20 },
      radius: 5,
      from: 0,
      to: -Math.PI * 1.5,
      counterclockwise: true,
    });
    expect(ret1(0.5).x).toBeCloseTo(6.464, 3);
    expect(ret1(0.5).y).toBeCloseTo(16.464, 3);
  });
});

describe("getCurveLerpFn", () => {
  test("should return lerp function for a line", () => {
    const ret0 = getCurveLerpFn([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(ret0(0).x).toBeCloseTo(0, 3);
    expect(ret0(0).y).toBeCloseTo(0, 3);
    expect(ret0(0.5).x).toBeCloseTo(5, 3);
    expect(ret0(0.5).y).toBeCloseTo(0, 3);
    expect(ret0(1).x).toBeCloseTo(10, 3);
    expect(ret0(1).y).toBeCloseTo(0, 3);
  });

  test("should return lerp function for an arc curve", () => {
    const ret0 = getCurveLerpFn(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      { d: { x: 5, y: 5 } },
    );
    expect(ret0(0).x).toBeCloseTo(0, 3);
    expect(ret0(0).y).toBeCloseTo(0, 3);
    expect(ret0(0.1).x).toBeCloseTo(0.245, 3);
    expect(ret0(0.1).y).toBeCloseTo(1.545, 3);
    expect(ret0(0.5).x).toBeCloseTo(5, 3);
    expect(ret0(0.5).y).toBeCloseTo(5, 3);
    expect(ret0(1).x).toBeCloseTo(10, 3);
    expect(ret0(1).y).toBeCloseTo(0, 3);
  });

  test("should return lerp function for a bezier curve", () => {
    const ret0 = getCurveLerpFn(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      { c1: { x: 2, y: 5 }, c2: { x: 8, y: 5 } },
    );
    expect(ret0(0).x).toBeCloseTo(0, 3);
    expect(ret0(0).y).toBeCloseTo(0, 3);
    expect(ret0(0.1).x).toBeCloseTo(0.712, 3);
    expect(ret0(0.1).y).toBeCloseTo(1.35, 3);
    expect(ret0(0.5).x).toBeCloseTo(5, 3);
    expect(ret0(0.5).y).toBeCloseTo(3.75, 3);
    expect(ret0(1).x).toBeCloseTo(10, 3);
    expect(ret0(1).y).toBeCloseTo(0, 3);
  });
});

describe("getArcBounds", () => {
  test("should return the bounds of the arc", () => {
    const c = { x: 100, y: 100 };
    const ret0 = getArcBounds({ c, radius: 10, from: -Math.PI / 4, to: Math.PI / 2 });
    expect(ret0.x).toBeCloseTo(100, 3);
    expect(ret0.width).toBeCloseTo(10, 3);
    expect(ret0.y).toBeCloseTo(92.929, 3);
    expect(ret0.height).toBeCloseTo(17.071, 3);

    const ret1 = getArcBounds({ c, radius: 10, from: Math.PI / 2, to: Math.PI * 1.25 });
    expect(ret1.x).toBeCloseTo(90, 3);
    expect(ret1.width).toBeCloseTo(10, 3);
    expect(ret1.y).toBeCloseTo(92.929, 3);
    expect(ret1.height).toBeCloseTo(17.071, 3);

    const ret2 = getArcBounds({ c, radius: 10, from: Math.PI * 0.25, to: Math.PI * 0.75 });
    expect(ret2.x).toBeCloseTo(92.929, 3);
    expect(ret2.width).toBeCloseTo(14.142, 3);
    expect(ret2.y).toBeCloseTo(107.071, 3);
    expect(ret2.height).toBeCloseTo(2.929, 3);
  });

  test("should return the bounds of the arc: counterclockwise", () => {
    const c = { x: 100, y: 100 };
    const ret0 = getArcBounds({ c, radius: 10, from: -Math.PI / 4, to: Math.PI / 2, counterclockwise: true });
    expect(ret0.x).toBeCloseTo(90, 3);
    expect(ret0.width).toBeCloseTo(17.071, 3);

    const ret1 = getArcBounds({ c, radius: 10, from: Math.PI / 2, to: Math.PI * 1.25, counterclockwise: true });
    expect(ret1.x).toBeCloseTo(92.929, 3);
    expect(ret1.width).toBeCloseTo(17.071, 3);

    const ret2 = getArcBounds({ c, radius: 10, from: Math.PI * 0.25, to: Math.PI * 0.75, counterclockwise: true });
    expect(ret2.x).toBeCloseTo(90, 3);
    expect(ret2.width).toBeCloseTo(20, 3);
  });
});
