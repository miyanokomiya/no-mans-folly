import { describe, test, expect } from "vitest";
import { struct } from "./arc";

describe("isPointOn", () => {
  test("should return false when a point is on the hole", () => {
    const shape = struct.create({ rx: 50, ry: 50, holeRate: 0.5 });
    expect(struct.isPointOn(shape, { x: 40, y: 40 })).toBe(false);
    expect(struct.isPointOn(shape, { x: 20, y: 20 })).toBe(true);
  });

  test("should return false when a point is on the gap", () => {
    const shape = struct.create({ rx: 50, ry: 50, from: Math.PI / 2, to: 0 });
    expect(struct.isPointOn(shape, { x: 60, y: 60 })).toBe(false);
    expect(struct.isPointOn(shape, { x: 40, y: 60 })).toBe(true);
  });

  test("should return false when a point is on the gap: rotated", () => {
    const shape = struct.create({ rx: 50, ry: 50, from: 0, to: -Math.PI / 2, rotation: Math.PI / 2 });
    expect(struct.isPointOn(shape, { x: 60, y: 60 })).toBe(false);
    expect(struct.isPointOn(shape, { x: 40, y: 60 })).toBe(true);
  });
});

describe("getIntersectedOutlines", () => {
  test("should return intersected outline along with the hole", () => {
    const shape = struct.create({ rx: 50, ry: 50, holeRate: 0.5, from: 0, to: Math.PI });
    expect(struct.getIntersectedOutlines?.(shape, { x: 50, y: -50 }, { x: 50, y: 150 })).toEqualPoints([
      { x: 50, y: 75 },
      { x: 50, y: 100 },
    ]);
  });

  test("should return intersected outline along with the hole: rotated", () => {
    const shape = struct.create({ rx: 50, ry: 50, holeRate: 0.5, from: Math.PI, to: 0, rotation: Math.PI });
    expect(struct.getIntersectedOutlines?.(shape, { x: 50, y: -50 }, { x: 50, y: 150 })).toEqualPoints([
      { x: 50, y: 75 },
      { x: 50, y: 100 },
    ]);
  });

  test("should return intersected outline along with the gap", () => {
    const shape = struct.create({ rx: 50, ry: 50, holeRate: 0.5, from: 0, to: Math.PI });
    expect(struct.getIntersectedOutlines?.(shape, { x: 10, y: -50 }, { x: 10, y: 150 })).toEqualPoints([
      { x: 10, y: 50 },
      { x: 10, y: 80 },
    ]);
    expect(struct.getIntersectedOutlines?.(shape, { x: 90, y: -50 }, { x: 90, y: 150 })).toEqualPoints([
      { x: 90, y: 50 },
      { x: 90, y: 80 },
    ]);
  });

  test("should return intersected outline along with the gap: rotated", () => {
    const shape = struct.create({ rx: 50, ry: 50, holeRate: 0.5, from: Math.PI, to: 0, rotation: Math.PI });
    expect(struct.getIntersectedOutlines?.(shape, { x: 10, y: -50 }, { x: 10, y: 150 })).toEqualPoints([
      { x: 10, y: 50 },
      { x: 10, y: 80 },
    ]);
    expect(struct.getIntersectedOutlines?.(shape, { x: 90, y: -50 }, { x: 90, y: 150 })).toEqualPoints([
      { x: 90, y: 50 },
      { x: 90, y: 80 },
    ]);
  });
});

describe("getClosestOutline", () => {
  test("should return closest outline along with the hole", () => {
    const shape = struct.create({ rx: 50, ry: 50, holeRate: 0.5, from: 0, to: Math.PI });
    expect(struct.getClosestOutline?.(shape, { x: 50, y: 70 }, 10)).toEqualPoint({ x: 50, y: 75 });
    expect(struct.getClosestOutline?.(shape, { x: 50, y: 80 }, 10)).toEqualPoint({ x: 50, y: 75 });
    expect(struct.getClosestOutline?.(shape, { x: 50, y: 90 }, 10)).toEqualPoint({ x: 50, y: 100 });
    expect(struct.getClosestOutline?.(shape, { x: 50, y: 100 }, 10)).toEqualPoint({ x: 50, y: 100 });
  });

  test("should return closest outline along with the hole: rotated", () => {
    const shape = struct.create({ rx: 50, ry: 50, holeRate: 0.5, from: Math.PI, to: 0, rotation: Math.PI });
    expect(struct.getClosestOutline?.(shape, { x: 50, y: 70 }, 10)).toEqualPoint({ x: 50, y: 75 });
    expect(struct.getClosestOutline?.(shape, { x: 50, y: 80 }, 10)).toEqualPoint({ x: 50, y: 75 });
    expect(struct.getClosestOutline?.(shape, { x: 50, y: 90 }, 10)).toEqualPoint({ x: 50, y: 100 });
    expect(struct.getClosestOutline?.(shape, { x: 50, y: 100 }, 10)).toEqualPoint({ x: 50, y: 100 });
  });

  test("should return closest outline along with the gap", () => {
    const shape = struct.create({ rx: 50, ry: 50, holeRate: 0.5, from: 0, to: Math.PI });
    expect(struct.getClosestOutline?.(shape, { x: 10, y: 49 }, 2)).toEqualPoint({ x: 10, y: 50 });
    expect(struct.getClosestOutline?.(shape, { x: 90, y: 49 }, 2)).toEqualPoint({ x: 90, y: 50 });
    expect(struct.getClosestOutline?.(shape, { x: 10, y: 80 }, 2)).toEqualPoint({ x: 10, y: 80 });
    expect(struct.getClosestOutline?.(shape, { x: 90, y: 80 }, 2)).toEqualPoint({ x: 90, y: 80 });
  });

  test("should return closest outline along with the gap: rotated", () => {
    const shape = struct.create({ rx: 50, ry: 50, holeRate: 0.5, from: Math.PI, to: 0, rotation: Math.PI });
    expect(struct.getClosestOutline?.(shape, { x: 10, y: 49 }, 2)).toEqualPoint({ x: 10, y: 50 });
    expect(struct.getClosestOutline?.(shape, { x: 90, y: 49 }, 2)).toEqualPoint({ x: 90, y: 50 });
    expect(struct.getClosestOutline?.(shape, { x: 10, y: 80 }, 2)).toEqualPoint({ x: 10, y: 80 });
    expect(struct.getClosestOutline?.(shape, { x: 90, y: 80 }, 2)).toEqualPoint({ x: 90, y: 80 });
  });
});
