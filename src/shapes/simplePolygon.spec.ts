import { describe, expect, test } from "vitest";
import {
  getStructForSimplePolygon,
  getNormalizedSimplePolygonShape,
  migrateRelativePoint,
  getAffineByRightExpansion,
  getAffineByLeftExpansion,
  getAffineByTopExpansion,
  getAffineByBottomExpansion,
  getMigrateRelativePointFn,
  getShapeDirection,
  SimplePolygonShape,
  getNextDirection4,
  getNextDirection2,
  getDirectionalSimplePath,
  SimplePath,
  getSimpleShapeTextRangeRect,
  getSimpleShapeRect,
  getSimpleShapeCenter,
} from "./simplePolygon";
import { struct as rectangleStruct } from "./rectangle";
import { struct as oneSidedArrowStruct } from "./oneSidedArrow";
import { applyAffine } from "okageo";
import { createShape, getCommonStruct } from ".";
import { TrapezoidShape } from "./polygons/trapezoid";
import { createBoxPadding } from "../utils/boxPadding";

describe("getStructForSimplePolygon", () => {
  const shape = rectangleStruct.create({ width: 100, height: 100 });
  const path = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];
  const target = getStructForSimplePolygon(() => ({ path }));

  describe("getWrapperRect", () => {
    test("should return wrapper rect", () => {
      expect(target.getWrapperRect(shape)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
      expect(target.getWrapperRect({ ...shape, p: { x: 10, y: 20 }, width: 200 })).toEqual({
        x: 10,
        y: 20,
        width: 200,
        height: 100,
      });
      const rotated = target.getWrapperRect({ ...shape, rotation: Math.PI / 2, width: 200 });
      expect(rotated.x).toBeCloseTo(50);
      expect(rotated.y).toBeCloseTo(-50);
      expect(rotated.width).toBeCloseTo(100);
      expect(rotated.height).toBeCloseTo(200);
    });
  });

  describe("getLocalRectPolygon", () => {
    test("should return local rect polygon", () => {
      expect(target.getLocalRectPolygon({ ...shape, p: { x: 10, y: 20 }, width: 200 })).toEqual([
        { x: 10, y: 20 },
        { x: 210, y: 20 },
        { x: 210, y: 120 },
        { x: 10, y: 120 },
      ]);
      const rotated = target.getLocalRectPolygon({ ...shape, rotation: Math.PI / 2, width: 200 });
      expect(rotated).toHaveLength(4);
      expect(rotated[0].x).toBeCloseTo(150);
      expect(rotated[0].y).toBeCloseTo(-50);
      expect(rotated[1].x).toBeCloseTo(150);
      expect(rotated[1].y).toBeCloseTo(150);
      expect(rotated[2].x).toBeCloseTo(50);
      expect(rotated[2].y).toBeCloseTo(150);
      expect(rotated[3].x).toBeCloseTo(50);
      expect(rotated[3].y).toBeCloseTo(-50);
    });
  });

  describe("isPointOn", () => {
    test("should return true if a point is on the polygon", () => {
      expect(target.isPointOn(shape, { x: -1, y: 0 })).toBe(false);
      expect(target.isPointOn(shape, { x: 1, y: 0 })).toBe(true);
      expect(target.isPointOn(shape, { x: 1, y: 2 })).toBe(false);
      expect(target.isPointOn(shape, { x: 3, y: 2 })).toBe(true);
    });
  });

  describe("resize", () => {
    test("should return resized patch", () => {
      expect(target.resize(shape, [1, 0, 0, 1, 10, 20])).toEqual({
        p: { x: 10, y: 20 },
      });
      expect(target.resize(shape, [2, 0, 0, 3, 0, 0])).toEqual({
        width: 200,
        height: 300,
      });

      const rotated = target.resize({ ...shape, width: 200 }, [
        Math.cos(Math.PI / 2),
        Math.sin(Math.PI / 2),
        -Math.sin(Math.PI / 2),
        Math.cos(Math.PI / 2),
        0,
        0,
      ]);
      expect(rotated.p?.x).toBeCloseTo(-150);
      expect(rotated.p?.y).toBeCloseTo(50);
      expect(rotated.rotation).toBeCloseTo(Math.PI / 2);
    });
  });

  describe("getClosestOutline", () => {
    test("should return the closest outline of the polygon", () => {
      expect(target.getClosestOutline!(shape, { x: -3, y: 0 }, 2)).toEqual(undefined);
      expect(target.getClosestOutline!(shape, { x: -1, y: -1 }, 2)).toEqual({ x: 0, y: 0 });
      expect(target.getClosestOutline!(shape, { x: 1, y: 0 }, 2)).toEqual({ x: 0, y: 0 });
      expect(target.getClosestOutline!(shape, { x: 1, y: 2 }, 2)).toEqual({ x: 1.5, y: 1.5 });
      expect(target.getClosestOutline!(shape, { x: 3, y: 2 }, 2)).toEqual({ x: 2.5, y: 2.5 });

      const ret1 = target.getClosestOutline!({ ...shape, rotation: Math.PI }, { x: 3, y: 2 }, 2);
      expect(ret1!.x).toBeCloseTo(2.5);
      expect(ret1!.y).toBeCloseTo(2.5);

      const ret2 = target.getClosestOutline!({ ...shape, rotation: Math.PI }, { x: -2, y: 20 }, 10);
      expect(ret2!.x).toBeCloseTo(0);
      expect(ret2!.y).toBeCloseTo(20);
    });

    test("should return the closest outline on a bezier segment", () => {
      const target = getStructForSimplePolygon(() => ({
        path,
        curves: [{ c1: { x: 20, y: -20 }, c2: { x: 80, y: 20 } }],
      }));
      expect(target.getClosestOutline!(shape, { x: 10, y: -10 }, 2)).toEqual(undefined);

      const ret1 = target.getClosestOutline!(shape, { x: 20, y: -5 }, 2);
      expect(ret1?.x).toBeCloseTo(20.036);
      expect(ret1?.y).toBeCloseTo(-5.7);

      const ret2 = target.getClosestOutline!(shape, { x: 101, y: 30 }, 2);
      expect(ret2?.x).toBeCloseTo(100);
      expect(ret2?.y).toBeCloseTo(30);
    });

    test("should return the closest point of the four directions when the option is provided", () => {
      const target = getStructForSimplePolygon(() => ({ path }), { outlineSnap: "trbl" });
      expect(target.getClosestOutline!(shape, { x: -3, y: 0 }, 2)).toEqual(undefined);
      expect(target.getClosestOutline!(shape, { x: 49, y: -1 }, 2)).toEqual({ x: 50, y: 0 });

      const ret1 = target.getClosestOutline!({ ...shape, rotation: Math.PI }, { x: 101, y: 51 }, 2);
      expect(ret1).toEqualPoint({ x: 100, y: 50 });
    });

    test("should return the closest point of the custom points when the option is provided", () => {
      const target = getStructForSimplePolygon(() => ({ path }), { getOutlineSnaps: () => [{ x: 0, y: 30 }] });
      expect(target.getClosestOutline!(shape, { x: 1, y: 20 }, 2)).toEqual(undefined);
      expect(target.getClosestOutline!(shape, { x: 1, y: 31 }, 2)).toEqual({ x: 0, y: 30 });
    });
  });

  describe("getIntersectedOutlines", () => {
    test("should return the intersected outline of the polygon", () => {
      expect(target.getIntersectedOutlines!(shape, { x: -3, y: 0 }, { x: -3, y: 10 })).toEqual(undefined);

      const res1 = target.getIntersectedOutlines!(shape, { x: -3, y: 0 }, { x: 3, y: 0 });
      expect(res1).toHaveLength(1);
      expect(res1?.[0].x).toBeCloseTo(0);
      expect(res1?.[0].y).toBeCloseTo(0);

      const res2 = target.getIntersectedOutlines!(shape, { x: 3, y: 2 }, { x: 3, y: 5 });
      expect(res2).toHaveLength(1);
      expect(res2?.[0].x).toBeCloseTo(3);
      expect(res2?.[0].y).toBeCloseTo(3);
    });

    test("should regard bezier segments", () => {
      const target = getStructForSimplePolygon(() => ({
        path,
        curves: [{ c1: { x: 20, y: -20 }, c2: { x: 80, y: 20 } }],
      }));
      expect(target.getIntersectedOutlines!(shape, { x: -3, y: 0 }, { x: -3, y: 10 })).toEqual(undefined);
      const res0 = target.getIntersectedOutlines!(shape, { x: -3, y: 0 }, { x: 80, y: 0 });
      expect(res0).toHaveLength(2);
      expect(res0?.[0].x).toBeCloseTo(0);
      expect(res0?.[0].y).toBeCloseTo(0);
      expect(res0?.[1].x).toBeCloseTo(50);
      expect(res0?.[1].y).toBeCloseTo(0);
    });
  });
});

describe("getNormalizedSimplePolygonShape", () => {
  const shape = oneSidedArrowStruct.create({ p: { x: 0, y: 0 }, width: 200, height: 100, rotation: Math.PI * 0.25 });

  test("should return equivalent arrow shape facing right: direction 0", () => {
    const result = getNormalizedSimplePolygonShape({ ...shape, direction: 0 });
    expect(result.p.x).toBeCloseTo(50);
    expect(result.p.y).toBeCloseTo(-50);
    expect(result.width).toBeCloseTo(shape.height);
    expect(result.height).toBeCloseTo(shape.width);
    expect(result.rotation).toBeCloseTo(Math.PI * -0.25);
  });

  test("should return equivalent arrow shape facing right: direction 1", () => {
    const result = getNormalizedSimplePolygonShape({ ...shape, direction: 1 });
    expect(result).toEqual(shape);
    expect(result.rotation).toBeCloseTo(Math.PI * 0.25);
  });

  test("should return equivalent arrow shape facing right: direction 2", () => {
    const result = getNormalizedSimplePolygonShape({ ...shape, direction: 2 });
    expect(result.p.x).toBeCloseTo(50);
    expect(result.p.y).toBeCloseTo(-50);
    expect(result.width).toBeCloseTo(shape.height);
    expect(result.height).toBeCloseTo(shape.width);
    expect(result.rotation).toBeCloseTo(Math.PI * 0.75);
  });

  test("should return equivalent arrow shape facing right: direction 3", () => {
    const result = getNormalizedSimplePolygonShape({ ...shape, direction: 3 });
    expect(result.p.x).toBeCloseTo(shape.p.x);
    expect(result.p.y).toBeCloseTo(shape.p.y);
    expect(result.width).toBeCloseTo(shape.width);
    expect(result.height).toBeCloseTo(shape.height);
    expect(result.rotation).toBeCloseTo(Math.PI * 1.25);
  });
});

describe("getMigrateRelativePointFn", () => {
  test("should return a function to migrate ralative point of the shape: regard direction", () => {
    const shape = createShape<TrapezoidShape>(getCommonStruct, "trapezoid", { direction: 2 });
    const target = getMigrateRelativePointFn(shape, { width: 50 });
    expect(target({ x: 0.1, y: 0.2 }, { x: 0, y: 0 })).toEqualPoint({ x: 0.1, y: 0.4 });
  });
});

describe("migrateRelativePoint", () => {
  test("should return relative point having the same distance away from the origin", () => {
    expect(
      migrateRelativePoint({ x: 0.1, y: 0.2 }, { width: 10, height: 20 }, { width: 20, height: 40 }, { x: 0, y: 0 }),
    ).toEqualPoint({ x: 0.05, y: 0.1 });
    expect(
      migrateRelativePoint({ x: 0.1, y: 0.2 }, { width: 10, height: 20 }, { width: 20, height: 40 }, { x: 1, y: 1 }),
    ).toEqualPoint({ x: 0.55, y: 0.6 });
  });
});

describe("getAffineByRightExpansion", () => {
  test("should retrun affine matrix to expand the shape by moving right anchor", () => {
    const shape = rectangleStruct.create({ width: 100, height: 100 });
    expect(
      applyAffine(getAffineByRightExpansion(shape, { x: 5, y: 50 }, 20), { x: 100, y: 50 }),
      "minimum ristriction",
    ).toEqualPoint({ x: 20, y: 50 });
    expect(applyAffine(getAffineByRightExpansion(shape, { x: 50, y: 50 }), { x: 100, y: 50 }), "shrink").toEqualPoint({
      x: 50,
      y: 50,
    });
    expect(applyAffine(getAffineByRightExpansion(shape, { x: 150, y: 50 }), { x: 100, y: 50 }), "expand").toEqualPoint({
      x: 150,
      y: 50,
    });
    expect(
      applyAffine(getAffineByRightExpansion(shape, { x: 200, y: -50 }), { x: 100, y: 50 }),
      "rotation",
    ).toEqualPoint({
      x: 200,
      y: -50,
    });
  });
});

describe("getAffineByLeftExpansion", () => {
  test("should retrun affine matrix to expand the shape by moving right anchor", () => {
    const shape = rectangleStruct.create({ width: 100, height: 100 });
    expect(
      applyAffine(getAffineByLeftExpansion(shape, { x: 95, y: 50 }, 20), { x: 0, y: 50 }),
      "minimum ristriction",
    ).toEqualPoint({ x: 80, y: 50 });
    expect(applyAffine(getAffineByLeftExpansion(shape, { x: 50, y: 50 }), { x: 0, y: 50 }), "shrink").toEqualPoint({
      x: 50,
      y: 50,
    });
    expect(applyAffine(getAffineByLeftExpansion(shape, { x: -50, y: 50 }), { x: 0, y: 50 }), "expand").toEqualPoint({
      x: -50,
      y: 50,
    });
    expect(applyAffine(getAffineByLeftExpansion(shape, { x: -100, y: -50 }), { x: 0, y: 50 }), "rotation").toEqualPoint(
      {
        x: -100,
        y: -50,
      },
    );
  });
});

describe("getAffineByTopExpansion", () => {
  test("should retrun affine matrix to expand the shape by moving top anchor", () => {
    const shape = rectangleStruct.create({ width: 100, height: 100 });
    expect(
      applyAffine(getAffineByTopExpansion(shape, { x: 50, y: 95 }, 20), { x: 50, y: 0 }),
      "minimum ristriction",
    ).toEqualPoint({ x: 50, y: 80 });
    expect(applyAffine(getAffineByTopExpansion(shape, { x: 50, y: 50 }), { x: 50, y: 0 }), "shrink").toEqualPoint({
      x: 50,
      y: 50,
    });
    expect(applyAffine(getAffineByTopExpansion(shape, { x: 50, y: -50 }), { x: 50, y: 0 }), "expand").toEqualPoint({
      x: 50,
      y: -50,
    });
    expect(applyAffine(getAffineByTopExpansion(shape, { x: -50, y: -100 }), { x: 50, y: 0 }), "rotation").toEqualPoint({
      x: -50,
      y: -100,
    });
  });
});

describe("getAffineByBottomExpansion", () => {
  test("should retrun affine matrix to expand the shape by moving bottom anchor", () => {
    const shape = rectangleStruct.create({ width: 100, height: 100 });
    expect(
      applyAffine(getAffineByBottomExpansion(shape, { x: 50, y: 5 }, 20), { x: 50, y: 100 }),
      "minimum ristriction",
    ).toEqualPoint({ x: 50, y: 20 });
    expect(applyAffine(getAffineByBottomExpansion(shape, { x: 50, y: 50 }), { x: 50, y: 100 }), "shrink").toEqualPoint({
      x: 50,
      y: 50,
    });
    expect(applyAffine(getAffineByBottomExpansion(shape, { x: 50, y: 150 }), { x: 50, y: 100 }), "expand").toEqualPoint(
      {
        x: 50,
        y: 150,
      },
    );
    expect(
      applyAffine(getAffineByBottomExpansion(shape, { x: -50, y: 200 }), { x: 50, y: 100 }),
      "rotation",
    ).toEqualPoint({
      x: -50,
      y: 200,
    });
  });
});

describe("getShapeDirection", () => {
  test("should return shape direction", () => {
    const shape = createShape<SimplePolygonShape>(getCommonStruct, "trapezoid", { direction: undefined });
    expect(getShapeDirection(shape)).toBe(1);
    expect(getShapeDirection({ ...shape, direction: 0 })).toBe(0);
    expect(getShapeDirection({ ...shape, direction: 1 })).toBe(1);
    expect(getShapeDirection({ ...shape, direction: 2 })).toBe(2);
    expect(getShapeDirection({ ...shape, direction: 3 })).toBe(3);
  });
});

describe("getNextDirection4", () => {
  test("should return next direction4", () => {
    expect(getNextDirection4(undefined)).toBe(2);
    expect(getNextDirection4(0)).toBe(1);
    expect(getNextDirection4(1)).toBe(2);
    expect(getNextDirection4(2)).toBe(3);
    expect(getNextDirection4(3)).toBe(0);
  });
});

describe("getNextDirection2", () => {
  test("should return next direction2", () => {
    expect(getNextDirection2(undefined)).toBe(0);
    expect(getNextDirection2(0)).toBe(1);
    expect(getNextDirection2(1)).toBe(0);
    expect(getNextDirection2(2)).toBe(1);
    expect(getNextDirection2(3)).toBe(0);
  });
});

describe("getDirectionalSimplePath", () => {
  test("should return directional simple path", () => {
    const shape = createShape<SimplePolygonShape>(getCommonStruct, "trapezoid", { direction: undefined });
    const getRawPath = () =>
      ({
        path: [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 100 },
          { x: 0, y: 100 },
        ],
        curves: [{ c1: { x: 0, y: 0 }, c2: { x: 50, y: 100 } }],
      }) as SimplePath;

    const res0 = getDirectionalSimplePath(shape, getRawPath);
    expect(res0.path).toEqual(getRawPath().path);
    expect(res0.curves).toEqual(getRawPath().curves);

    const res1 = getDirectionalSimplePath({ ...shape, direction: 2 }, getRawPath);
    expect(res1.path).toEqualPoints([
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 0, y: 200 },
      { x: 0, y: 0 },
    ]);
    expect(res1.curves?.[0]?.c1).toEqualPoint({ x: 100, y: 0 });
    expect(res1.curves?.[0]?.c2).toEqualPoint({ x: 0, y: 50 });

    const res2 = getDirectionalSimplePath({ ...shape, direction: 3 }, getRawPath);
    expect(res2.path).toEqualPoints([
      { x: 100, y: 100 },
      { x: -100, y: 100 },
      { x: -100, y: 0 },
      { x: 100, y: 0 },
    ]);
    expect(res2.curves?.[0]?.c1).toEqualPoint({ x: 100, y: 100 });
    expect(res2.curves?.[0]?.c2).toEqualPoint({ x: 50, y: 0 });

    const res3 = getDirectionalSimplePath({ ...shape, direction: 0 }, getRawPath);
    expect(res3.path).toEqualPoints([
      { x: 0, y: 100 },
      { x: 0, y: -100 },
      { x: 100, y: -100 },
      { x: 100, y: 100 },
    ]);
    expect(res3.curves?.[0]?.c1).toEqualPoint({ x: 0, y: 100 });
    expect(res3.curves?.[0]?.c2).toEqualPoint({ x: 100, y: 50 });
  });
});

describe("getSimpleShapeTextRangeRect", () => {
  test("should return text range rectangle", () => {
    const shape = rectangleStruct.create({
      p: { x: 10, y: 20 },
      width: 100,
      height: 200,
      textPadding: createBoxPadding([1, 2, 3, 4]),
    });
    const getRect = (s: SimplePolygonShape) => ({
      x: s.p.x,
      y: s.p.y,
      width: s.width,
      height: s.height * 0.6,
    });
    const ret0 = getSimpleShapeTextRangeRect(shape, getRect);
    expect(ret0).toEqualPoint({ x: 14, y: 21 });
    expect(ret0.width).toBe(94);
    expect(ret0.height).toBe(116);
  });

  test("should regard the direction of the shape", () => {
    const shape = oneSidedArrowStruct.create({
      width: 100,
      height: 200,
      textPadding: createBoxPadding([0, 0, 0, 0]),
    });

    const getRect = (s: SimplePolygonShape) => ({
      x: s.p.x,
      y: s.p.y,
      width: s.width,
      height: s.height * 0.6,
    });

    const ret0 = getSimpleShapeTextRangeRect({ ...shape, direction: 0 }, getRect);
    expect(ret0).toEqualPoint({ x: 0, y: 0 });
    expect(ret0.width).toBe(60);
    expect(ret0.height).toBe(200);

    const ret1 = getSimpleShapeTextRangeRect({ ...shape, direction: 1 }, getRect);
    expect(ret1).toEqualPoint({ x: 0, y: 0 });
    expect(ret1.width).toBe(100);
    expect(ret1.height).toBe(120);

    const ret2 = getSimpleShapeTextRangeRect({ ...shape, direction: 2 }, getRect);
    expect(ret2).toEqualPoint({ x: 40, y: 0 });
    expect(ret2.width).toBe(60);
    expect(ret2.height).toBe(200);

    const ret3 = getSimpleShapeTextRangeRect({ ...shape, direction: 3 }, getRect);
    expect(ret3).toEqualPoint({ x: 0, y: 80 });
    expect(ret3.width).toBe(100);
    expect(ret3.height).toBe(120);
  });
});

describe("getSimpleShapeRect", () => {
  test("should return the rect of the shape", () => {
    const shape = rectangleStruct.create({
      p: { x: 10, y: 20 },
      width: 100,
      height: 200,
    });
    expect(getSimpleShapeRect(shape)).toEqualRect({ x: 10, y: 20, width: 100, height: 200 });
  });
});

describe("getSimpleShapeCenter", () => {
  test("should return the center of the shape", () => {
    const shape = rectangleStruct.create({
      p: { x: 10, y: 20 },
      width: 100,
      height: 200,
    });
    expect(getSimpleShapeCenter(shape)).toEqualPoint({ x: 60, y: 120 });
  });
});
