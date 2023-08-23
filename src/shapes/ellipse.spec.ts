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
      };
      struct.render(ctx as any, shape);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.ellipse).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  describe("getRect", () => {
    test("should return the rectangle", () => {
      const shape = struct.create({ p: { x: 1, y: 2 }, rx: 3, ry: 4 });
      expect(struct.getRect(shape)).toEqual({ x: -2, y: -2, width: 6, height: 8 });
    });
  });

  describe("isPointOn", () => {
    test("should return true if the point is on the shape", () => {
      const shape = struct.create({ rx: 3, ry: 3 });
      expect(struct.isPointOn(shape, { x: 2, y: 2 })).toBe(true);
      expect(struct.isPointOn(shape, { x: 15, y: 5 })).toBe(false);
    });
  });
});
