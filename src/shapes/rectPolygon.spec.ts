import { describe, test, expect } from "vitest";
import { getRectShapeCenter, getRectShapeRect } from "./rectPolygon";
import { struct as rectangleStruct } from "./rectangle";

describe("getSimpleShapeRect", () => {
  test("should return the rect of the shape", () => {
    const shape = rectangleStruct.create({
      p: { x: 10, y: 20 },
      width: 100,
      height: 200,
    });
    expect(getRectShapeRect(shape)).toEqualRect({ x: 10, y: 20, width: 100, height: 200 });
  });
});

describe("getSimpleShapeCenter", () => {
  test("should return the center of the shape", () => {
    const shape = rectangleStruct.create({
      p: { x: 10, y: 20 },
      width: 100,
      height: 200,
    });
    expect(getRectShapeCenter(shape)).toEqualPoint({ x: 60, y: 120 });
  });
});
