import { describe, test, expect } from "vitest";
import { getRectShapeCenter, getRectShapeRect, isSizeChanged } from "./rectPolygon";
import { struct as rectangleStruct } from "./rectangle";

describe("getSimpleShapeRect", () => {
  test("should return the rect of the shape", () => {
    const shape = rectangleStruct.create({
      p: { x: 10, y: 20 },
      width: 100,
      height: 200,
    });
    expect(getRectShapeRect(shape)).toEqualRect({ x: 10, y: 20, width: 100, height: 200 });
  });
});

describe("getSimpleShapeCenter", () => {
  test("should return the center of the shape", () => {
    const shape = rectangleStruct.create({
      p: { x: 10, y: 20 },
      width: 100,
      height: 200,
    });
    expect(getRectShapeCenter(shape)).toEqualPoint({ x: 60, y: 120 });
  });
});

describe("isSizeChanged", () => {
  const shape = rectangleStruct.create({
    p: { x: 10, y: 20 },
    width: 100,
    height: 200,
  });

  test("should return true when size changed", () => {
    expect(isSizeChanged(shape, {})).toBe(false);
    expect(isSizeChanged(shape, { width: 101 })).toBe(true);
    expect(isSizeChanged(shape, { height: 101 })).toBe(true);
    expect(isSizeChanged(shape, { width: 101, height: 101 })).toBe(true);
  });
  test("should accept floating-point error", () => {
    expect(isSizeChanged(shape, { width: 100 })).toBe(false);
    expect(isSizeChanged(shape, { width: 100.0000001 })).toBe(false);
    expect(isSizeChanged(shape, { height: 200 })).toBe(false);
    expect(isSizeChanged(shape, { height: 200.0000001 })).toBe(false);
  });
});
