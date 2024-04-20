import { describe, test, expect } from "vitest";
import { struct, getRawStarPath } from "./star";
import { getOuterRectangle } from "okageo";

describe("getRawStarPath", () => {
  const shape = struct.create({ width: 200, height: 100, c0: { x: 0.5, y: 0.25 }, size: 5 });

  test("should return star path within the bounds", () => {
    const bounds = {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    };

    expect(getOuterRectangle([getRawStarPath(shape).path])).toEqualRect(bounds);
    expect(getOuterRectangle([getRawStarPath({ ...shape, size: 0 }).path])).toEqualRect(bounds);
    expect(getOuterRectangle([getRawStarPath({ ...shape, size: 9 }).path])).toEqualRect(bounds);
    expect(getOuterRectangle([getRawStarPath({ ...shape, c0: { x: 0.5, y: 0 } }).path])).toEqualRect(bounds);
    expect(getOuterRectangle([getRawStarPath({ ...shape, c0: { x: 0.5, y: 0.5 } }).path])).toEqualRect(bounds);
    expect(getOuterRectangle([getRawStarPath({ ...shape, c0: { x: 0.5, y: -0.2 } }).path])).toEqualRect(bounds);
    expect(getOuterRectangle([getRawStarPath({ ...shape, c0: { x: 0.5, y: 0.7 } }).path])).toEqualRect(bounds);
  });

  test("should return star path of any number of vertices", () => {
    expect(getRawStarPath({ ...shape, size: 2 }).path).toHaveLength(6);
    expect(getRawStarPath({ ...shape, size: 3 }).path).toHaveLength(6);
    expect(getRawStarPath({ ...shape, size: 4 }).path).toHaveLength(8);
    expect(getRawStarPath({ ...shape, size: 5 }).path).toHaveLength(10);
    expect(getRawStarPath({ ...shape, size: 64 }).path).toHaveLength(128);
  });
});
