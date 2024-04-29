import { describe, test, expect } from "vitest";
import { struct } from "./moon";

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

    const shape1 = struct.create({ rx: 50, ry: 50, innsetC: { x: 0.25, y: 0.5 }, radiusRate: 2 });
    expect(struct.isPointOn(shape1, { x: 24, y: 50 })).toBe(true);
    expect(struct.isPointOn(shape1, { x: 26, y: 50 })).toBe(false);
  });
});

describe("getIntersectedOutlines", () => {
  test("should return intersections", () => {
    const shape = struct.create({ rx: 50, ry: 50, innsetC: { x: 0.5, y: 0.5 }, radiusRate: 1 });
    const res = struct.getIntersectedOutlines?.(shape, { x: 70, y: 0 }, { x: 70, y: 100 });
    expect(res).toHaveLength(4);
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
});
