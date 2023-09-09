import { describe, expect, test } from "vitest";
import {
  ISegment,
  expandRect,
  getClosestOutlineOnEllipse,
  getClosestOutlineOnRectangle,
  getCrossLineAndEllipse,
  getCrossSegAndSeg,
  getLocationFromRateOnRectPath,
  getRectCenterLines,
  getRectLines,
  getRectPoints,
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
      4
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
      4
    );
    expect(res1).toBe(undefined);

    const res2 = getCrossLineAndEllipse(
      [
        { x: -3, y: 10 },
        { x: -3, y: 0 },
      ],
      { x: 0, y: 0 },
      3,
      4
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
      4
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
      4
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
      ])
    ).toEqual({ x: 1, y: 2, width: 15, height: 27 });
    expect(
      getWrapperRect([
        { x: 1, y: 2, width: 10, height: 20 },
        { x: 6, y: 7, width: 4, height: 6 },
      ])
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
      ])
    ).toBe(false);
    expect(
      isSegmentOverlappedV(seg, [
        { x: -10, y: 0 },
        { x: 1, y: 0 },
      ])
    ).toBe(true);
    expect(
      isSegmentOverlappedV(seg, [
        { x: 1, y: 0 },
        { x: 9, y: 0 },
      ])
    ).toBe(true);
    expect(
      isSegmentOverlappedV(seg, [
        { x: 9, y: 0 },
        { x: 11, y: 0 },
      ])
    ).toBe(true);
    expect(
      isSegmentOverlappedV(seg, [
        { x: 11, y: 0 },
        { x: 12, y: 0 },
      ])
    ).toBe(false);
    expect(
      isSegmentOverlappedV(seg, [
        { x: 11, y: 0 },
        { x: 9, y: 0 },
      ])
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
      ])
    ).toBe(false);
    expect(
      isSegmentOverlappedH(seg, [
        { y: -10, x: 0 },
        { y: 1, x: 0 },
      ])
    ).toBe(true);
    expect(
      isSegmentOverlappedH(seg, [
        { y: 1, x: 0 },
        { y: 9, x: 0 },
      ])
    ).toBe(true);
    expect(
      isSegmentOverlappedH(seg, [
        { y: 9, x: 0 },
        { y: 11, x: 0 },
      ])
    ).toBe(true);
    expect(
      isSegmentOverlappedH(seg, [
        { y: 11, x: 0 },
        { y: 12, x: 0 },
      ])
    ).toBe(false);
    expect(
      isSegmentOverlappedH(seg, [
        { y: 11, x: 0 },
        { y: 9, x: 0 },
      ])
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
        ]
      )
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
        ]
      )
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
      ])
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
