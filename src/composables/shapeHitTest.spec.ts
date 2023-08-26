import { expect, describe, test } from "vitest";
import { newCircleHitTest, newRectInRectHitTest } from "./shapeHitTest";

describe("newCircleHitTest", () => {
  test("should return hit test utils", () => {
    const target = newCircleHitTest({ x: 10, y: 20 }, 2);
    expect(target.test({ x: 13, y: 24 })).toBe(false);
    expect(target.test({ x: 11, y: 21 })).toBe(true);
  });
});

describe("newRectInRectHitTest", () => {
  const target = newRectInRectHitTest({
    x: 0,
    y: 0,
    width: 10,
    height: 20,
  });
  test("should return true if target is in the range", () => {
    expect(target.test({ x: 0, y: 0, width: 10, height: 20 })).toBe(true);
  });
  test("should return false if target is not in the range", () => {
    expect(target.test({ x: -1, y: 0, width: 10, height: 20 })).toBe(false);
    expect(target.test({ x: 0, y: -1, width: 10, height: 20 })).toBe(false);
    expect(target.test({ x: 0, y: 0, width: 11, height: 20 })).toBe(false);
    expect(target.test({ x: 0, y: 0, width: 10, height: 21 })).toBe(false);
  });
});
