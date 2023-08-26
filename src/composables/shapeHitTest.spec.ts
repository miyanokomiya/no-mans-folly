import { expect, describe, test } from "vitest";
import { newCircleHitTest } from "./shapeHitTest";

describe("newCircleHitTest", () => {
  test("should return hit test utils", () => {
    const target = newCircleHitTest({ x: 10, y: 20 }, 2);
    expect(target.measure({ x: 13, y: 24 })).toBe(25);
    expect(target.test({ x: 13, y: 24 })).toBe(false);
    expect(target.test({ x: 11, y: 21 })).toBe(true);
  });
});
