import { expect, describe, test } from "vitest";
import { struct, getHeadControlPoint, getTailControlPoint } from "./oneSidedArrow";

describe("getHeadControlPoint", () => {
  const shape = struct.create({ p: { x: 1000, y: 2000 }, width: 200, height: 100, headControl: { x: 0.8, y: 0.35 } });

  test("should return abstruct head control point: direction 0", () => {
    expect(getHeadControlPoint({ ...shape, direction: 0 })).toEqual({ x: 1070, y: 2020 });
  });

  test("should return abstruct head control point: direction 1", () => {
    expect(getHeadControlPoint(shape)).toEqual({ x: 1160, y: 2035 });
  });

  test("should return abstruct head control point: direction 2", () => {
    expect(getHeadControlPoint({ ...shape, direction: 2 })).toEqual({ x: 1130, y: 2080 });
  });

  test("should return abstruct head control point: direction 3", () => {
    expect(getHeadControlPoint({ ...shape, direction: 3 })).toEqual({ x: 1040, y: 2065 });
  });
});

describe("getTailControlPoint", () => {
  const shape = struct.create({ p: { x: 1000, y: 2000 }, width: 200, height: 100, tailControl: { x: 0.2, y: 0.4 } });

  test("should return abstruct tail control point: direction 0", () => {
    expect(getTailControlPoint({ ...shape, direction: 0 })).toEqual({ x: 1080, y: 2100 });
  });

  test("should return abstruct tail control point: direction 1", () => {
    expect(getTailControlPoint(shape)).toEqual({ x: 1000, y: 2040 });
  });

  test("should return abstruct tail control point: direction 2", () => {
    expect(getTailControlPoint({ ...shape, direction: 2 })).toEqual({ x: 1120, y: 2000 });
  });

  test("should return abstruct tail control point: direction 3", () => {
    expect(getTailControlPoint({ ...shape, direction: 3 })).toEqual({ x: 1200, y: 2060 });
  });

  test("tail control should be based on head control", () => {
    const shape1 = struct.create({
      width: 100,
      height: 200,
      headControl: { x: 0.5, y: 0.2 },
      tailControl: { x: 0, y: 0.3 },
    });
    expect(getTailControlPoint(shape1)).toEqual({ x: 0, y: 60 });
  });
});
