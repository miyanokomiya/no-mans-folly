import { expect, describe, test } from "vitest";
import { struct, isTextShape, patchPosition } from "./text";

describe("resize", () => {
  test("should update maxWidth when width changes", () => {
    const shape = struct.create({ width: 100, height: 100 });
    expect(struct.resize(shape, [1, 0, 0, 1, 0, 0])).toEqual({});
    expect(struct.resize(shape, [1, 0, 0, 2, 0, 0])).toEqual({ height: 200 });
    expect(struct.resize(shape, [2, 0, 0, 1, 0, 0])).toEqual({ width: 200, maxWidth: 200 });
  });
});

describe("refreshRelation", () => {
  test("should patch object to refresh line connection", () => {
    const shape = struct.create({ parentId: "a", hAlign: "center", vAlign: "center", lineAttached: 0.5 });
    expect(struct.refreshRelation?.(shape, new Set(["a"]))).toEqual(undefined);

    const result = struct.refreshRelation?.(shape, new Set([]));
    expect(result).toEqual({ lineAttached: undefined, hAlign: undefined, vAlign: undefined });
    expect(result).toHaveProperty("lineAttached");
    expect(result).toHaveProperty("hAlign");
    expect(result).toHaveProperty("vAlign");
  });

  test("should patch object to refresh line connection whenever it has no valid parent but has lineAttached", () => {
    const shape = struct.create({ hAlign: "center", vAlign: "center", lineAttached: 0.5 });
    expect(struct.refreshRelation?.(shape, new Set(["a"]))).toEqual({
      lineAttached: undefined,
      hAlign: undefined,
      vAlign: undefined,
    });
  });

  test("should not refresh parent when it has valid parent but doesn't have lineAttached", () => {
    const shape = struct.create({ parentId: "a", hAlign: "center", vAlign: "center", lineAttached: undefined });
    expect(struct.refreshRelation?.(shape, new Set(["a"]))).toEqual(undefined);
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
    expect(struct.resizeOnTextEdit?.(shape, { width: 100, height: 100 })).toEqual(undefined);
    expect(struct.resizeOnTextEdit?.(shape, { width: 200, height: 100 })).toEqual({ width: 200 });
    expect(struct.resizeOnTextEdit?.(shape, { width: 100, height: 200 })).toEqual({ height: 200 });
    expect(struct.resizeOnTextEdit?.(shape, { width: 200, height: 200 })).toEqual({ width: 200, height: 200 });
  });

  test("should patch position due to the alignment", () => {
    const shape = struct.create({ p: { x: 0, y: 0 }, width: 100, height: 200 });
    expect(struct.resizeOnTextEdit?.({ ...shape, hAlign: "center" }, { width: 200, height: 200 })).toEqual({
      width: 200,
      p: { x: -50, y: 0 },
    });
    expect(struct.resizeOnTextEdit?.({ ...shape, hAlign: "right" }, { width: 200, height: 200 })).toEqual({
      width: 200,
      p: { x: -100, y: 0 },
    });
    expect(struct.resizeOnTextEdit?.({ ...shape, vAlign: "center" }, { width: 100, height: 300 })).toEqual({
      height: 300,
      p: { x: 0, y: -50 },
    });
    expect(struct.resizeOnTextEdit?.({ ...shape, vAlign: "bottom" }, { width: 100, height: 300 })).toEqual({
      height: 300,
      p: { x: 0, y: -100 },
    });
    expect(
      struct.resizeOnTextEdit?.({ ...shape, hAlign: "center", vAlign: "bottom" }, { width: 200, height: 300 }),
    ).toEqual({
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
    expect(patchPosition({ ...shape, hAlign: "left", vAlign: "top" }, { x: 10, y: 20 })).toEqual({
      p: { x: 10, y: 20 },
    });
  });

  test("should deal with rotation", () => {
    const shape = struct.create({ p: { x: 0, y: 0 }, width: 10, height: 20, rotation: Math.PI / 2 });
    const result = patchPosition(shape, { x: 0, y: 0 });
    expect(result?.p?.x).toBeCloseTo(-15);
    expect(result?.p?.y).toBeCloseTo(-5);

    const shape1 = struct.create({
      p: { x: 20, y: 20 },
      width: 20,
      height: 10,
      rotation: Math.PI / 2,
      hAlign: "left",
      vAlign: "center",
    });
    const result1 = patchPosition(shape1, { x: 30, y: 0 });
    expect(result1?.p?.x).toBeCloseTo(20);
    expect(result1?.p?.y).toBeCloseTo(5);
  });

  test("should deal with extra margin", () => {
    const shape = struct.create({ p: { x: 0, y: 0 }, width: 100, height: 200 });
    expect(patchPosition({ ...shape, hAlign: "center" }, { x: 0, y: 0 }, 10)).toEqual({ p: { x: -50, y: 10 } });
    expect(patchPosition({ ...shape, vAlign: "center" }, { x: 0, y: 0 }, 10)).toEqual({ p: { x: 10, y: -100 } });
  });
});
