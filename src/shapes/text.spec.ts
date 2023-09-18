import { expect, describe, test } from "vitest";
import { struct, isTextShape, patchSize } from "./text";

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
});
