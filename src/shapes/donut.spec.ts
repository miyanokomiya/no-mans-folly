import { expect, describe, test } from "vitest";
import { struct } from "./donut";

describe("struct", () => {
  describe("create", () => {
    test("should return new shape", () => {
      const result = struct.create();
      expect(result.type).toBe("donut");
    });
  });

  describe("getWrapperRect", () => {
    test("should return the rectangle", () => {
      const shape = struct.create({ p: { x: -2, y: -2 }, rx: 3, ry: 4 });
      expect(struct.getWrapperRect(shape)).toEqual({ x: -2, y: -2, width: 6, height: 8 });
    });
  });

  describe("isPointOn", () => {
    test("should return true if the point is on the shape", () => {
      const shape = struct.create({ rx: 3, ry: 3, holeRate: 0.5 });
      expect(struct.isPointOn(shape, { x: 1, y: 1 })).toBe(true);
      expect(struct.isPointOn(shape, { x: 2, y: 2 }), "inside the hole").toBe(false);
      expect(struct.isPointOn(shape, { x: 5, y: 5 })).toBe(true);
      expect(struct.isPointOn(shape, { x: 15, y: 5 })).toBe(false);
    });

    test("should prioritize the marker points", () => {
      const shape = struct.create({ rx: 10, ry: 10 });
      expect(struct.getClosestOutline?.(shape, { x: 11, y: 1 }, 2)).toEqual({ x: 10, y: 0 });
      expect(struct.getClosestOutline?.(shape, { x: 21, y: 9 }, 2)).toEqual({ x: 20, y: 10 });
      expect(struct.getClosestOutline?.(shape, { x: 1, y: 11 }, 2)).toEqual({ x: 0, y: 10 });
      expect(struct.getClosestOutline?.(shape, { x: 9, y: 21 }, 2)).toEqual({ x: 10, y: 20 });
    });
  });

  describe("getIntersectedOutlines", () => {
    test("should return intersected outlines for a donut", () => {
      const shape = struct.create({ rx: 50, ry: 25, holeRate: 0.8 });
      const points = [
        { x: 20, y: 5 },
        { x: 20, y: 11.771243444677047 },
        { x: 20, y: 38.22875655532295 },
        { x: 20, y: 45 },
      ];
      expect(struct.getIntersectedOutlines?.(shape, { x: 20, y: 0 }, { x: 20, y: 100 })).toEqualPoints(points);
      expect(struct.getIntersectedOutlines?.(shape, { x: 20, y: 0 }, { x: 20, y: 25 })).toEqualPoints(
        points.slice(0, 2),
      );
      expect(struct.getIntersectedOutlines?.(shape, { x: 20, y: 10 }, { x: 20, y: 100 })).toEqualPoints(
        points.slice(1, 4),
      );
      expect(struct.getIntersectedOutlines?.(shape, { x: 20, y: 25 }, { x: 20, y: 100 })).toEqualPoints(
        points.slice(2, 4),
      );
    });

    test("should return undefined if no intersected outlines are found", () => {
      const shape = struct.create({ rx: 10, ry: 5 });
      const segStart = { x: 30, y: 30 };
      const segEnd = { x: 40, y: 40 };
      const result = struct.getIntersectedOutlines?.(shape, segStart, segEnd);
      expect(result).toBe(undefined);
    });
  });
});
