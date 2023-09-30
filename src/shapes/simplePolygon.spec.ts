import { describe, expect, test } from "vitest";
import { getStructForSimplePolygon } from "./simplePolygon";
import { struct as rectangleStruct } from "./rectangle";

describe("getStructForSimplePolygon", () => {
  const shape = rectangleStruct.create({ width: 100, height: 100 });
  const path = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];
  const target = getStructForSimplePolygon(() => path);

  describe("isPointOn", () => {
    test("should return true if a point is on the polygon", () => {
      expect(target.isPointOn(shape, { x: -1, y: 0 })).toBe(false);
      expect(target.isPointOn(shape, { x: 1, y: 0 })).toBe(true);
      expect(target.isPointOn(shape, { x: 1, y: 2 })).toBe(false);
      expect(target.isPointOn(shape, { x: 3, y: 2 })).toBe(true);
    });
  });

  describe("getClosestOutline", () => {
    test("should return the closest outline of the polygon", () => {
      expect(target.getClosestOutline!(shape, { x: -3, y: 0 }, 2)).toEqual(undefined);
      expect(target.getClosestOutline!(shape, { x: -1, y: -1 }, 2)).toEqual({ x: 0, y: 0 });
      expect(target.getClosestOutline!(shape, { x: 1, y: 0 }, 2)).toEqual({ x: 0, y: 0 });
      expect(target.getClosestOutline!(shape, { x: 1, y: 2 }, 2)).toEqual({ x: 1.5, y: 1.5 });
      expect(target.getClosestOutline!(shape, { x: 3, y: 2 }, 2)).toEqual({ x: 2.5, y: 2.5 });
    });
  });

  describe("getIntersectedOutlines", () => {
    test("should return the intersected outline of the polygon", () => {
      expect(target.getIntersectedOutlines!(shape, { x: -3, y: 0 }, { x: -3, y: 10 })).toEqual(undefined);
      expect(target.getIntersectedOutlines!(shape, { x: -3, y: 0 }, { x: 3, y: 0 })).toEqual([{ x: 0, y: 0 }]);
      expect(target.getIntersectedOutlines!(shape, { x: 3, y: 2 }, { x: 3, y: 5 })).toEqual([{ x: 3, y: 3 }]);
    });
  });
});
