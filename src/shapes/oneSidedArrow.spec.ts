import { expect, describe, test } from "vitest";
import {
  struct,
  getHeadControlPoint,
  getTailControlPoint,
  getNormalizedArrowShape,
  getArrowHeadPoint,
  getArrowTailPoint,
} from "./oneSidedArrow";

describe("getNormalizedArrowShape", () => {
  const shape = struct.create({ p: { x: 0, y: 0 }, width: 200, height: 100, rotation: Math.PI * 0.25 });

  test("should return equivalent arrow shape facing right: direction 0", () => {
    const result = getNormalizedArrowShape({ ...shape, direction: 0 });
    expect(result.p.x).toBeCloseTo(50);
    expect(result.p.y).toBeCloseTo(-50);
    expect(result.width).toBeCloseTo(shape.height);
    expect(result.height).toBeCloseTo(shape.width);
    expect(result.rotation).toBeCloseTo(Math.PI * -0.25);
  });

  test("should return equivalent arrow shape facing right: direction 1", () => {
    const result = getNormalizedArrowShape({ ...shape, direction: 1 });
    expect(result).toEqual(shape);
    expect(result.rotation).toBeCloseTo(Math.PI * 0.25);
  });

  test("should return equivalent arrow shape facing right: direction 2", () => {
    const result = getNormalizedArrowShape({ ...shape, direction: 2 });
    expect(result.p.x).toBeCloseTo(50);
    expect(result.p.y).toBeCloseTo(-50);
    expect(result.width).toBeCloseTo(shape.height);
    expect(result.height).toBeCloseTo(shape.width);
    expect(result.rotation).toBeCloseTo(Math.PI * 0.75);
  });

  test("should return equivalent arrow shape facing right: direction 3", () => {
    const result = getNormalizedArrowShape({ ...shape, direction: 3 });
    expect(result.p.x).toBeCloseTo(shape.p.x);
    expect(result.p.y).toBeCloseTo(shape.p.y);
    expect(result.width).toBeCloseTo(shape.width);
    expect(result.height).toBeCloseTo(shape.height);
    expect(result.rotation).toBeCloseTo(Math.PI * 1.25);
  });
});

describe("getHeadControlPoint", () => {
  const shape = struct.create({ p: { x: 1000, y: 2000 }, width: 200, height: 100, headControl: { x: 0.2, y: 0.3 } });

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
      headControl: { x: 0.5, y: 0.8 },
      tailControl: { x: 0, y: 0.5 },
    });
    expect(getTailControlPoint(shape1)).toEqual({ x: 0, y: 60 });
  });
});

describe("getArrowHeadPoint", () => {
  const shape = struct.create({ p: { x: 1000, y: 2000 }, width: 200, height: 100, headControl: { x: 0.2, y: 0.3 } });
  test("should return head point", () => {
    const result0 = getArrowHeadPoint({ ...shape, direction: 0 });
    expect(result0.x).toBeCloseTo(1100);
    expect(result0.y).toBeCloseTo(2000);

    const result1 = getArrowHeadPoint({ ...shape, direction: 1 });
    expect(result1.x).toBeCloseTo(1200);
    expect(result1.y).toBeCloseTo(2050);

    const result2 = getArrowHeadPoint({ ...shape, direction: 2 });
    expect(result2.x).toBeCloseTo(1100);
    expect(result2.y).toBeCloseTo(2100);

    const result3 = getArrowHeadPoint({ ...shape, direction: 3 });
    expect(result3.x).toBeCloseTo(1000);
    expect(result3.y).toBeCloseTo(2050);
  });
});

describe("getArrowTailPoint", () => {
  const shape = struct.create({ p: { x: 1000, y: 2000 }, width: 200, height: 100, headControl: { x: 0.2, y: 0.3 } });
  test("should return head point", () => {
    const result0 = getArrowTailPoint({ ...shape, direction: 0 });
    expect(result0.x).toBeCloseTo(1100);
    expect(result0.y).toBeCloseTo(2100);

    const result1 = getArrowTailPoint({ ...shape, direction: 1 });
    expect(result1.x).toBeCloseTo(1000);
    expect(result1.y).toBeCloseTo(2050);

    const result2 = getArrowTailPoint({ ...shape, direction: 2 });
    expect(result2.x).toBeCloseTo(1100);
    expect(result2.y).toBeCloseTo(2000);

    const result3 = getArrowTailPoint({ ...shape, direction: 3 });
    expect(result3.x).toBeCloseTo(1200);
    expect(result3.y).toBeCloseTo(2050);
  });
});
