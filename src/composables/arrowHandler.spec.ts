import { describe, test, expect } from "vitest";
import { patchToMoveHead } from "./arrowHandler";
import { createShape, getCommonStruct } from "../shapes";
import { OneSidedArrowShape } from "../shapes/oneSidedArrow";

describe("patchToMoveHead", () => {
  const shape = createShape<OneSidedArrowShape>(getCommonStruct, "one_sided_arrow", {
    p: { x: 0, y: 0 },
    width: 200,
    height: 100,
  });

  test("should return patch info to move the arrow head: rotate", () => {
    const result0 = patchToMoveHead(shape, { x: 0, y: 200 });
    expect(result0.width).toBeCloseTo(150);
    expect(result0.height).toBe(undefined);
    expect(result0.p?.x).toBeCloseTo(-75);
    expect(result0.p?.y).toBeCloseTo(75);
    expect(result0.rotation).toBeCloseTo(Math.PI / 2);
  });

  test("should return patch info to move the arrow head: each direction", () => {
    const result0 = patchToMoveHead({ ...shape, direction: 0 }, { x: 100, y: -100 });
    expect(result0.width).toBe(undefined);
    expect(result0.height).toBeCloseTo(200);
    expect(result0.p?.x).toBeCloseTo(0);
    expect(result0.p?.y).toBeCloseTo(-100);

    const result1 = patchToMoveHead(shape, { x: 400, y: 50 });
    expect(result1.width).toBeCloseTo(400);
    expect(result1.height).toBe(undefined);
    expect(result1.p).toBe(undefined);
    expect(result1.rotation).toBe(undefined);

    const result2 = patchToMoveHead({ ...shape, direction: 2 }, { x: 100, y: 200 });
    expect(result2.width).toBe(undefined);
    expect(result2.height).toBeCloseTo(200);
    expect(result2.p).toBe(undefined);

    const result3 = patchToMoveHead({ ...shape, direction: 3 }, { x: -100, y: 50 });
    expect(result3.width).toBeCloseTo(300);
    expect(result3.height).toBe(undefined);
    expect(result3.p?.x).toBeCloseTo(-100);
    expect(result3.p?.y).toBeCloseTo(0);
  });
});
