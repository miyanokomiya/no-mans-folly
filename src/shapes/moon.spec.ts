import { describe, test, expect } from "vitest";
import { struct } from "./moon";
import { getDistance } from "okageo";

describe("isPointOn", () => {
  test("should return true when a point is on the moon", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1 });
    expect(struct.isPointOn(shape, { x: 49, y: 50 })).toBe(true);
    expect(struct.isPointOn(shape, { x: 51, y: 50 })).toBe(false);
  });

  test("should return true when a point is on the moon: rotated ellipse", () => {
    const shape = struct.create({ rx: 100, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1, rotation: Math.PI / 2 });
    expect(struct.isPointOn(shape, { x: 100, y: -49 })).toBe(true);
    expect(struct.isPointOn(shape, { x: 100, y: -51 })).toBe(false);
  });

  test("should return true when a point is on the moon: hole size", () => {
    const shape0 = struct.create({ rx: 50, ry: 50, innsetC: { x: 0.75, y: 0.5 }, radiusRate: 2 });
    expect(struct.isPointOn(shape0, { x: 74, y: 50 })).toBe(true);
    expect(struct.isPointOn(shape0, { x: 76, y: 50 })).toBe(false);

    const shape1 = struct.create({ rx: 50, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 2 });
    expect(struct.isPointOn(shape1, { x: 49, y: 50 })).toBe(true);
    expect(struct.isPointOn(shape1, { x: 51, y: 50 })).toBe(false);
  });
});

describe("getIntersectedOutlines", () => {
  test("should return intersections", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1 });
    const res = struct.getIntersectedOutlines?.(shape, { x: 70, y: 0 }, { x: 70, y: 100 });
    expect(res).toHaveLength(4);
    expect(struct.getIntersectedOutlines?.(shape, { x: 70, y: 0 }, { x: 70, y: 50 })).toHaveLength(2);
    expect(struct.getIntersectedOutlines?.(shape, { x: 70, y: 0 }, { x: 70, y: 5 })).toHaveLength(1);
    expect(struct.getIntersectedOutlines?.(shape, { x: 70, y: 50 }, { x: 70, y: 100 })).toHaveLength(2);
    expect(struct.getIntersectedOutlines?.(shape, { x: 70, y: 95 }, { x: 70, y: 100 })).toHaveLength(1);
  });

  test("should return intersections: rotated", () => {
    const shape0 = struct.create({
      rx: 50,
      ry: 50,
      innsetC: { x: 0.5, y: 0.5 },
      radiusRate: 1,
      rotation: Math.PI / 32,
    });
    const res0 = struct.getIntersectedOutlines?.(shape0, { x: 70, y: 0 }, { x: 70, y: 100 });
    expect(res0).toHaveLength(4);

    const shape1 = struct.create({
      rx: 50,
      ry: 50,
      innsetC: { x: 0.5, y: 0.5 },
      radiusRate: 1,
      rotation: Math.PI / 16,
    });
    const res1 = struct.getIntersectedOutlines?.(shape1, { x: 70, y: 0 }, { x: 70, y: 100 });
    expect(res1).toHaveLength(2);
  });

  test("should return intersections: ellipse", () => {
    const shape = struct.create({ rx: 100, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1 });
    const res0 = struct.getIntersectedOutlines?.(shape, { x: 70, y: 0 }, { x: 70, y: 100 });
    expect(res0).toHaveLength(2);

    const res1 = struct.getIntersectedOutlines?.(shape, { x: 110, y: 0 }, { x: 110, y: 100 });
    expect(res1).toHaveLength(4);

    const res2 = struct.getIntersectedOutlines?.(shape, { x: 149, y: 0 }, { x: 149, y: 100 });
    expect(res2, "within the tips").toHaveLength(4);

    const res3 = struct.getIntersectedOutlines?.(shape, { x: 151, y: 0 }, { x: 151, y: 100 });
    expect(res3, "beyond the tips").toBe(undefined);
  });

  test("should return intersections: full moon", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 1, y: 0.5 }, radiusRate: 1 });
    expect(struct.getIntersectedOutlines?.(shape, { x: 50, y: -50 }, { x: 50, y: 150 })).toEqualPoints([
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    ]);
    expect(struct.getIntersectedOutlines?.(shape, { x: 150, y: -50 }, { x: 150, y: 150 })).toBe(undefined);
  });

  test("should return intersections: new moon", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 0, y: 0.5 }, radiusRate: 1 });
    expect(struct.getIntersectedOutlines?.(shape, { x: 50, y: -50 }, { x: 50, y: 150 })).toBe(undefined);
    expect(struct.getIntersectedOutlines?.(shape, { x: 150, y: -50 }, { x: 150, y: 150 })).toBe(undefined);
  });
});

describe("getClosestOutline", () => {
  test("should return closest outline: tips", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1 });
    const res0 = struct.getClosestOutline?.(shape, { x: 74, y: 6 }, 2);
    expect(res0).toEqualPoint({ x: 75, y: 50 + Math.sin(-Math.acos(1 / 2)) * 50 });

    const res1 = struct.getClosestOutline?.(shape, { x: 74, y: 94 }, 2);
    expect(res1).toEqualPoint({ x: 75, y: 50 + Math.sin(Math.acos(1 / 2)) * 50 });
  });

  test("should return closest outline: outline", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1 });
    const res0 = struct.getClosestOutline?.(shape, { x: 5, y: 25 }, 2);
    expect(getDistance(res0!, { x: 50, y: 50 })).toBeCloseTo(50);
    expect(res0!.x).toBeGreaterThan(5);
  });

  test("should return closest outline: outline: rotated ellipse", () => {
    const shape = struct.create({ rx: 100, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1, rotation: Math.PI / 2 });
    const res0 = struct.getClosestOutline?.(shape, { x: 125, y: -37.5 }, 5);
    expect(res0).toEqualPoint({ x: 124.8069469178417, y: -36.82431421244591 });
  });

  test("should return closest outline: inner outline", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1 });
    const res0 = struct.getClosestOutline?.(shape, { x: 49, y: 50 }, 2);
    expect(res0).toEqualPoint({ x: 50, y: 50 });
  });

  test("should return closest outline: inner outline: rotated ellipse", () => {
    const shape = struct.create({ rx: 100, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1, rotation: Math.PI / 2 });
    const res0 = struct.getClosestOutline?.(shape, { x: 125, y: 60 }, 5);
    expect(res0).toEqualPoint({ x: 124.2821465589316, y: 62.58427238784621 });
  });

  test("should return closest outline: full moon", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 1, y: 0.5 }, radiusRate: 1 });
    expect(struct.getClosestOutline?.(shape, { x: 50, y: 1 }, 2)).toEqualPoint({ x: 50, y: 0 });
    expect(struct.getClosestOutline?.(shape, { x: 150, y: 1 }, 2)).toBe(undefined);
  });

  test("should return intersections: new moon", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 0, y: 0.5 }, radiusRate: 1 });
    expect(struct.getClosestOutline?.(shape, { x: 50, y: 1 }, 2)).toBe(undefined);
    expect(struct.getClosestOutline?.(shape, { x: 150, y: 1 }, 2)).toBe(undefined);
  });
});

describe("getOutlinePaths", () => {
  test("should return outline paths", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1 });
    const res = struct.getOutlinePaths!(shape);
    expect(res).toHaveLength(1);
    expect(res[0].path).toHaveLength(9);
    expect(res[0].path[0]).toEqualPoint({ x: 75, y: 93.3012702 });
    expect(res[0].path[2]).toEqualPoint({ x: 0, y: 50 });
    expect(res[0].path[4]).toEqualPoint({ x: 75, y: 6.6987298 });
    expect(res[0].path[6]).toEqualPoint({ x: 50, y: 50 });
    expect(res[0].path[8]).toEqualPoint({ x: 75, y: 93.3012702 });
    expect(res[0].curves).toHaveLength(8);
  });
});
