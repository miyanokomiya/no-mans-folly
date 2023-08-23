import { describe, expect, test } from "vitest";
import { expandRect, getWrapperRect, isPointOnEllipse, isPointOnRectangle } from "./geometry";

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

describe("isPointOnEllipse", () => {
  test("should return true if the point is on the rectangle", () => {
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
