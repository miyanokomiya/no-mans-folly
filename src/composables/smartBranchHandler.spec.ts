import { describe, test, expect } from "vitest";
import { getAbovePosition, getBelowPosition, getLeftPosition, getRightPosition } from "./smartBranchHandler";

describe("getBelowPosition", () => {
  test("should return better position to avoid obstacles", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getBelowPosition(rect, [], 100, 25)).toEqual({ x: 0, y: 200 });
    expect(getBelowPosition(rect, [{ x: 0, y: 220, width: 100, height: 100 }], 100, 25)).toEqual({ x: 125, y: 200 });
    expect(
      getBelowPosition(
        rect,
        [
          { x: 0, y: 220, width: 100, height: 100 },
          { x: 150, y: 220, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: -125, y: 200 });
    expect(
      getBelowPosition(
        rect,
        [
          { x: 0, y: 220, width: 100, height: 100 },
          { x: 120, y: 220, width: 100, height: 100 },
          { x: -130, y: 220, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: 250, y: 200 });
  });
});

describe("getAbovePosition", () => {
  test("should return better position to avoid obstacles", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getAbovePosition(rect, [], 100, 25)).toEqual({ x: 0, y: -200 });
    expect(getAbovePosition(rect, [{ x: 0, y: -220, width: 100, height: 100 }], 100, 25)).toEqual({ x: 125, y: -200 });
    expect(
      getAbovePosition(
        rect,
        [
          { x: 0, y: -220, width: 100, height: 100 },
          { x: 150, y: -220, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: -125, y: -200 });
    expect(
      getAbovePosition(
        rect,
        [
          { x: 0, y: -220, width: 100, height: 100 },
          { x: 120, y: -220, width: 100, height: 100 },
          { x: -130, y: -220, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: 250, y: -200 });
  });
});

describe("getRightPosition", () => {
  test("should return better position to avoid obstacles", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getRightPosition(rect, [], 100, 25)).toEqual({ x: 200, y: 0 });
    expect(getRightPosition(rect, [{ x: 220, y: 0, width: 100, height: 100 }], 100, 25)).toEqual({ x: 200, y: 125 });
    expect(
      getRightPosition(
        rect,
        [
          { x: 220, y: 0, width: 100, height: 100 },
          { x: 220, y: 150, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: 200, y: -125 });
    expect(
      getRightPosition(
        rect,
        [
          { x: 220, y: 0, width: 100, height: 100 },
          { x: 220, y: 120, width: 100, height: 100 },
          { x: 220, y: -130, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: 200, y: 250 });
  });
});

describe("getLeftPosition", () => {
  test("should return better position to avoid obstacles", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getLeftPosition(rect, [], 100, 25)).toEqual({ x: -200, y: 0 });
    expect(getLeftPosition(rect, [{ x: -220, y: 0, width: 100, height: 100 }], 100, 25)).toEqual({ x: -200, y: 125 });
    expect(
      getLeftPosition(
        rect,
        [
          { x: -220, y: 0, width: 100, height: 100 },
          { x: -220, y: 150, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: -200, y: -125 });
    expect(
      getLeftPosition(
        rect,
        [
          { x: -220, y: 0, width: 100, height: 100 },
          { x: -220, y: 120, width: 100, height: 100 },
          { x: -220, y: -130, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: -200, y: 250 });
  });
});
