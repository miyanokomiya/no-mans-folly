import { describe, expect, test } from "vitest";
import {
  expandRect,
  getRectLines,
  getRectPoints,
  getRotatedWrapperRect,
  getWrapperRect,
  isPointCloseToSegment,
  isPointOnEllipse,
  isPointOnEllipseRotated,
  isPointOnRectangle,
  isPointOnRectangleRotated,
} from "./geometry";

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
  test("should return a rectangle to wrap rotated rectangle", () => {
    expect(getRectPoints({ x: 1, y: 2, width: 10, height: 20 })).toEqual([
      { x: 1, y: 2 },
      { x: 11, y: 2 },
      { x: 11, y: 22 },
      { x: 1, y: 22 },
    ]);
  });
});

describe("getRectLines", () => {
  test("should return a rectangle to wrap rotated rectangle", () => {
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
