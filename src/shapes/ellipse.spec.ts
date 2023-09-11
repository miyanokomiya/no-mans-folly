import { expect, describe, test, vi } from "vitest";
import { struct } from "./ellipse";

describe("struct", () => {
  describe("create", () => {
    test("should return new shape", () => {
      const result = struct.create();
      expect(result.type).toBe("ellipse");
    });
  });

  describe("render", () => {
    test("should render the shape", () => {
      const shape = struct.create();
      const ctx = {
        beginPath: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
      };
      struct.render(ctx as any, shape);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.ellipse).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
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
      const shape = struct.create({ rx: 3, ry: 3 });
      expect(struct.isPointOn(shape, { x: 2, y: 2 })).toBe(true);
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
});
