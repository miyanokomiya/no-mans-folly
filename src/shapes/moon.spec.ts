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
