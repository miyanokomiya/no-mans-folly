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

  describe("getWrapperRect", () => {
    test("should return wrapper rect", () => {
      expect(target.getWrapperRect(shape)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
      expect(target.getWrapperRect({ ...shape, p: { x: 10, y: 20 }, width: 200 })).toEqual({
        x: 10,
        y: 20,
        width: 200,
        height: 100,
      });
      const rotated = target.getWrapperRect({ ...shape, rotation: Math.PI / 2, width: 200 });
      expect(rotated.x).toBeCloseTo(50);
      expect(rotated.y).toBeCloseTo(-50);
      expect(rotated.width).toBeCloseTo(100);
      expect(rotated.height).toBeCloseTo(200);
    });
  });

  describe("getLocalRectPolygon", () => {
    test("should return local rect polygon", () => {
      expect(target.getLocalRectPolygon({ ...shape, p: { x: 10, y: 20 }, width: 200 })).toEqual([
        { x: 10, y: 20 },
        { x: 210, y: 20 },
        { x: 210, y: 120 },
        { x: 10, y: 120 },
      ]);
      const rotated = target.getLocalRectPolygon({ ...shape, rotation: Math.PI / 2, width: 200 });
      expect(rotated).toHaveLength(4);
      expect(rotated[0].x).toBeCloseTo(150);
      expect(rotated[0].y).toBeCloseTo(-50);
      expect(rotated[1].x).toBeCloseTo(150);
      expect(rotated[1].y).toBeCloseTo(150);
      expect(rotated[2].x).toBeCloseTo(50);
      expect(rotated[2].y).toBeCloseTo(150);
      expect(rotated[3].x).toBeCloseTo(50);
      expect(rotated[3].y).toBeCloseTo(-50);
    });
  });

  describe("isPointOn", () => {
    test("should return true if a point is on the polygon", () => {
      expect(target.isPointOn(shape, { x: -1, y: 0 })).toBe(false);
      expect(target.isPointOn(shape, { x: 1, y: 0 })).toBe(true);
      expect(target.isPointOn(shape, { x: 1, y: 2 })).toBe(false);
      expect(target.isPointOn(shape, { x: 3, y: 2 })).toBe(true);
    });
  });

  describe("resize", () => {
    test("should return resized patch", () => {
      expect(target.resize(shape, [1, 0, 0, 1, 10, 20])).toEqual({
        p: { x: 10, y: 20 },
      });
      expect(target.resize(shape, [2, 0, 0, 3, 0, 0])).toEqual({
        width: 200,
        height: 300,
      });

      const rotated = target.resize({ ...shape, width: 200 }, [
        Math.cos(Math.PI / 2),
        Math.sin(Math.PI / 2),
        -Math.sin(Math.PI / 2),
        Math.cos(Math.PI / 2),
        0,
        0,
      ]);
      expect(rotated.p?.x).toBeCloseTo(-150);
      expect(rotated.p?.y).toBeCloseTo(50);
      expect(rotated.rotation).toBeCloseTo(Math.PI / 2);
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
