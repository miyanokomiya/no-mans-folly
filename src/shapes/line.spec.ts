import { expect, describe, test, vi } from "vitest";
import { getLinePath, patchVertex, struct } from "./line";

describe("struct", () => {
  describe("create", () => {
    test("should return new shape", () => {
      const result = struct.create();
      expect(result.type).toBe("line");
    });
  });

  describe("render", () => {
    test("should render the shape", () => {
      const shape = struct.create();
      const ctx = {
        beginPath: vi.fn(),
        closePath: vi.fn(),
        lineTo: vi.fn(),
        moveTo: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
      };
      struct.render(ctx as any, shape);
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  describe("getWrapperRect", () => {
    test("should return the rect", () => {
      const shape = struct.create({ p: { x: 1, y: 2 }, q: { x: 10, y: -20 } });
      expect(struct.getWrapperRect(shape)).toEqual({ x: 1, y: -20, width: 9, height: 22 });
    });
  });

  describe("isPointOn", () => {
    test("should return true if the point is on the shape", () => {
      const shape = struct.create({ p: { x: 0, y: 0 }, q: { x: 10, y: 0 } });
      expect(struct.isPointOn(shape, { x: -1, y: 0 })).toBe(false);
      expect(struct.isPointOn(shape, { x: 1, y: 0 })).toBe(true);
    });
  });
});

describe("getLinePath", () => {
  test("should return vertices of the line", () => {
    const shape = struct.create({ p: { x: 0, y: 0 }, q: { x: 10, y: 0 } });
    expect(getLinePath(shape)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
  });
});

describe("patchVertex", () => {
  test("should return patched object of the line", () => {
    const shape = struct.create({ p: { x: 0, y: 0 }, q: { x: 10, y: 0 } });
    const v = { x: -1, y: -1 };
    expect(patchVertex(shape, 0, v)).toEqual({ p: v });
    expect(patchVertex(shape, 1, v)).toEqual({ q: v });
    expect(patchVertex(shape, 2, v)).toEqual({});
  });
});
