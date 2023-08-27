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
        lineTo: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
      };
      struct.render(ctx as any, shape);
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  describe("getRect", () => {
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
});
