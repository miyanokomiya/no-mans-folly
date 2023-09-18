import { expect, describe, test } from "vitest";
import { struct, isTextShape, patchSize, patchPosition } from "./text";

describe("resize", () => {
  test("should update maxWidth when width changes", () => {
    const shape = struct.create({ width: 100, height: 100 });
    expect(struct.resize(shape, [1, 0, 0, 1, 0, 0])).toEqual({});
    expect(struct.resize(shape, [1, 0, 0, 2, 0, 0])).toEqual({ height: 200 });
    expect(struct.resize(shape, [2, 0, 0, 1, 0, 0])).toEqual({ width: 200, maxWidth: 200 });
  });
});

describe("isTextShape", () => {
  test("should return true if the shale is text shape", () => {
    const shape = struct.create();
    expect(isTextShape(shape)).toBe(true);
    expect(isTextShape({ ...shape, type: "rectangle" })).toBe(false);
  });
});

describe("patchSize", () => {
  test("should return patched properties", () => {
    const shape = struct.create({ width: 100, height: 100 });
    expect(patchSize(shape, { width: 100, height: 100 })).toEqual(undefined);
    expect(patchSize(shape, { width: 200, height: 100 })).toEqual({ width: 200 });
    expect(patchSize(shape, { width: 100, height: 200 })).toEqual({ height: 200 });
    expect(patchSize(shape, { width: 200, height: 200 })).toEqual({ width: 200, height: 200 });
  });

  test("should patch position due to the alignment", () => {
    const shape = struct.create({ p: { x: 0, y: 0 }, width: 100, height: 200 });
    expect(patchSize({ ...shape, hAlign: "center" }, { width: 200, height: 200 })).toEqual({
      width: 200,
      p: { x: -50, y: 0 },
    });
    expect(patchSize({ ...shape, hAlign: "right" }, { width: 200, height: 200 })).toEqual({
      width: 200,
      p: { x: -100, y: 0 },
    });
    expect(patchSize({ ...shape, vAlign: "center" }, { width: 100, height: 300 })).toEqual({
      height: 300,
      p: { x: 0, y: -50 },
    });
    expect(patchSize({ ...shape, vAlign: "bottom" }, { width: 100, height: 300 })).toEqual({
      height: 300,
      p: { x: 0, y: -100 },
    });
    expect(patchSize({ ...shape, hAlign: "center", vAlign: "bottom" }, { width: 200, height: 300 })).toEqual({
      width: 200,
      height: 300,
      p: { x: -50, y: -100 },
    });
  });
});

describe("patchPosition", () => {
  test("should return patched position based on alignment", () => {
    const shape = struct.create({ p: { x: 0, y: 0 }, width: 100, height: 200 });
    expect(patchPosition(shape, { x: 0, y: 0 })).toEqual(undefined);
    expect(patchPosition({ ...shape, hAlign: "center" }, { x: 0, y: 0 })).toEqual({ p: { x: -50, y: 0 } });
    expect(patchPosition({ ...shape, hAlign: "right" }, { x: 0, y: 0 })).toEqual({ p: { x: -100, y: 0 } });
    expect(patchPosition({ ...shape, vAlign: "center" }, { x: 0, y: 0 })).toEqual({ p: { x: 0, y: -100 } });
    expect(patchPosition({ ...shape, vAlign: "bottom" }, { x: 0, y: 0 })).toEqual({ p: { x: 0, y: -200 } });
    expect(patchPosition({ ...shape, hAlign: "center", vAlign: "bottom" }, { x: 0, y: 0 })).toEqual({
      p: { x: -50, y: -200 },
    });
  });
});
