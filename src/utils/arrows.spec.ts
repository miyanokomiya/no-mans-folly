import { describe, test, expect } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { OneSidedArrowShape } from "../shapes/oneSidedArrow";
import { patchToMoveHead, patchToMoveTail, getArrowHeadPoint, getArrowTailPoint } from "./arrows";

describe("getArrowHeadPoint", () => {
  const shape = createShape<OneSidedArrowShape>(getCommonStruct, "one_sided_arrow", {
    p: { x: 1000, y: 2000 },
    width: 200,
    height: 100,
    headControl: { x: 0.2, y: 0.3 },
  });
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
  const shape = createShape<OneSidedArrowShape>(getCommonStruct, "one_sided_arrow", {
    p: { x: 1000, y: 2000 },
    width: 200,
    height: 100,
    headControl: { x: 0.2, y: 0.3 },
  });
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

describe("patchToMoveTail", () => {
  const shape = createShape<OneSidedArrowShape>(getCommonStruct, "one_sided_arrow", {
    p: { x: 0, y: 0 },
    width: 200,
    height: 100,
  });

  test("should return patch info to move the arrow tail: rotate", () => {
    const result0 = patchToMoveTail(shape, { x: 200, y: 200 });
    expect(result0.width).toBeCloseTo(150);
    expect(result0.height).toBe(undefined);
    expect(result0.p?.x).toBeCloseTo(125);
    expect(result0.p?.y).toBeCloseTo(75);
    expect(result0.rotation).toBeCloseTo(-Math.PI / 2);
  });

  test("should return patch info to move the arrow tail: each direction", () => {
    const result0 = patchToMoveTail({ ...shape, direction: 0 }, { x: 100, y: 200 });
    expect(result0.width).toBe(undefined);
    expect(result0.height).toBeCloseTo(200);
    expect(result0.p).toBe(undefined);

    const result1 = patchToMoveTail(shape, { x: 50, y: 50 });
    expect(result1.width).toBeCloseTo(150);
    expect(result1.height).toBe(undefined);
    expect(result1.p?.x).toBeCloseTo(50);
    expect(result1.p?.y).toBeCloseTo(0);

    const result2 = patchToMoveTail({ ...shape, direction: 2 }, { x: 100, y: 20 });
    expect(result2.width).toBe(undefined);
    expect(result2.height).toBeCloseTo(80);
    expect(result2.p?.x).toBeCloseTo(0);
    expect(result2.p?.y).toBeCloseTo(20);

    const result3 = patchToMoveTail({ ...shape, direction: 3 }, { x: 300, y: 50 });
    expect(result3.width).toBeCloseTo(300);
    expect(result3.height).toBe(undefined);
    expect(result3.p).toBe(undefined);
  });
});
