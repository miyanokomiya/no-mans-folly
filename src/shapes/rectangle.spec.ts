import { expect, describe, test, vi } from "vitest";
import { struct } from "./rectangle";

describe("struct", () => {
  describe("create", () => {
    test("should return new shape", () => {
      const result = struct.create();
      expect(result.type).toBe("rectangle");
    });
  });

  describe("render", () => {
    test("should render the shape", () => {
      const shape = struct.create();
      const ctx = {
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
      };
      struct.render(ctx as any, shape, {} as any);
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  describe("getWrapperRect", () => {
    test("should return the rectangle", () => {
      const shape = struct.create({ p: { x: 1, y: 2 }, width: 3, height: 4 });
      expect(struct.getWrapperRect(shape)).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    });
  });

  describe("isPointOn", () => {
    test("should return true if the point is on the shape", () => {
      const shape = struct.create({ width: 10, height: 10 });
      expect(struct.isPointOn(shape, { x: 5, y: 5 })).toBe(true);
      expect(struct.isPointOn(shape, { x: 15, y: 5 })).toBe(false);
    });
  });

  describe("getClosestOutline", () => {
    test("should return the closest outline point", () => {
      const shape = struct.create({ width: 10, height: 10 });
      expect(struct.getClosestOutline?.(shape, { x: -3, y: 3 }, 2)).toEqual(undefined);
      expect(struct.getClosestOutline?.(shape, { x: -1, y: 2.5 }, 2)).toEqual({ x: 0, y: 2.5 });
    });

    test("should prioritize the marker points", () => {
      const shape = struct.create({ width: 10, height: 10 });
      expect(struct.getClosestOutline?.(shape, { x: 1, y: 1 }, 2)).toEqual({ x: 0, y: 0 });
      expect(struct.getClosestOutline?.(shape, { x: 9, y: 1 }, 2)).toEqual({ x: 10, y: 0 });
      expect(struct.getClosestOutline?.(shape, { x: 11, y: 11 }, 2)).toEqual({ x: 10, y: 10 });
      expect(struct.getClosestOutline?.(shape, { x: -1, y: 11 }, 2)).toEqual({ x: 0, y: 10 });
    });
  });

  describe("getIntersectedOutlines", () => {
    test("should return the intersected outline points by closer order", () => {
      const shape = struct.create({ width: 10, height: 10 });
      expect(struct.getIntersectedOutlines?.(shape, { x: -3, y: 3 }, { x: -3, y: 13 })).toEqual(undefined);

      const res1 = struct.getIntersectedOutlines?.(shape, { x: 3, y: -3 }, { x: 3, y: 13 });
      expect(res1).toHaveLength(2);
      expect(res1?.[0].x).toBeCloseTo(3);
      expect(res1?.[0].y).toBeCloseTo(0);
      expect(res1?.[1].x).toBeCloseTo(3);
      expect(res1?.[1].y).toBeCloseTo(10);

      const res2 = struct.getIntersectedOutlines?.(shape, { x: 3, y: 3 }, { x: 3, y: 13 });
      expect(res2).toHaveLength(1);
      expect(res2?.[0].x).toBeCloseTo(3);
      expect(res2?.[0].y).toBeCloseTo(10);
    });
  });

  describe("getTangentAt", () => {
    test("should return tangent at the point", () => {
      const shape = struct.create({ width: 100, height: 100, rotation: Math.PI / 4 });
      expect(struct.getTangentAt?.(shape, { x: 14, y: 14 })).toBeCloseTo(-Math.PI / 4);
      expect(struct.getTangentAt?.(shape, { x: 86, y: 14 })).toBeCloseTo(Math.PI / 4);
    });
  });
});
