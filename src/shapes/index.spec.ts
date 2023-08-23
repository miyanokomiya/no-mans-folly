import { expect, describe, test, vi } from "vitest";
import { createShape, getCommonStruct, getRect, isPointOn, renderShape } from ".";
import { RectangleShape } from "./rectangle";

describe("createShape", () => {
  test("should return new shape", () => {
    const result = createShape(getCommonStruct, "rectangle", { id: "test" });
    expect(result.id).toBe("test");
    expect(result.type).toBe("rectangle");
  });
});

describe("renderShape", () => {
  test("should render the shape", () => {
    const shape = createShape(getCommonStruct, "rectangle", { id: "test" });
    const ctx = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
    };
    renderShape(getCommonStruct, ctx as any, shape);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.strokeRect).toHaveBeenCalled();
  });
});

describe("getRect", () => {
  test("should return rectangle", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
    expect(getRect(getCommonStruct, shape)).toEqual({ x: 0, y: 0, width: 10, height: 20 });
  });
});

describe("isPointOn", () => {
  test("should return true if the point is on the shape", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
    expect(isPointOn(getCommonStruct, shape, { x: -3, y: 3 })).toBe(false);
    expect(isPointOn(getCommonStruct, shape, { x: 3, y: 3 })).toBe(true);
  });
});
