import { expect, describe, test, vi } from "vitest";
import {
  createShape,
  getCommonStruct,
  getLocationRateOnShape,
  getWrapperRect,
  getWrapperRectForShapes,
  isPointOn,
  renderShape,
} from ".";
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
      beginPath: vi.fn(),
      closePath: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
    };
    renderShape(getCommonStruct, ctx as any, shape);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

describe("getRect", () => {
  test("should return rectangle", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
    expect(getWrapperRect(getCommonStruct, shape)).toEqual({ x: 0, y: 0, width: 10, height: 20 });
  });
});

describe("isPointOn", () => {
  test("should return true if the point is on the shape", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
    expect(isPointOn(getCommonStruct, shape, { x: -3, y: 3 })).toBe(false);
    expect(isPointOn(getCommonStruct, shape, { x: 3, y: 3 })).toBe(true);
  });
});

describe("getLocationRateOnShape", () => {
  test("should return location rate on the shape", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
    const result0 = getLocationRateOnShape(getCommonStruct, shape, { x: 0, y: 0 });
    expect(result0.x).toBeCloseTo(0);
    expect(result0.y).toBeCloseTo(0);

    const result1 = getLocationRateOnShape(getCommonStruct, shape, { x: 2, y: 15 });
    expect(result1.x).toBeCloseTo(0.2);
    expect(result1.y).toBeCloseTo(3 / 4);

    const result2 = getLocationRateOnShape(getCommonStruct, { ...shape, rotation: Math.PI / 2 }, { x: 5, y: 14 });
    expect(result2.x).toBeCloseTo(0.9);
    expect(result2.y).toBeCloseTo(0.5);
  });
});

describe("getWrapperRectForShapes", () => {
  test("should return wrapper rectangle for shapes", () => {
    const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
    const shape1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "test",
      p: {
        x: 10,
        y: 20,
      },
      width: 10,
      height: 20,
    });
    const result0 = getWrapperRectForShapes(getCommonStruct, [shape0, shape1]);
    expect(result0.x).toBeCloseTo(0);
    expect(result0.y).toBeCloseTo(0);
    expect(result0.width).toBeCloseTo(20);
    expect(result0.height).toBeCloseTo(40);
  });
});
