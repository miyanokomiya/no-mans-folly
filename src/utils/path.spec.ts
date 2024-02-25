import { describe, expect, test } from "vitest";
import { getCrossBezierPathAndSegment } from "./path";

describe("getCrossBezierPathAndSegment", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  test("should return intersection information: straight segment", () => {
    const res0 = getCrossBezierPathAndSegment({ path, curves: [] }, [
      { x: 4, y: -10 },
      { x: 4, y: -5 },
    ]);
    expect(res0).toHaveLength(0);

    const res1 = getCrossBezierPathAndSegment({ path, curves: [] }, [
      { x: 4, y: -10 },
      { x: 4, y: 20 },
    ]);
    expect(res1).toHaveLength(2);
    expect(res1?.[0][0].x).toBeCloseTo(4);
    expect(res1?.[0][0].y).toBeCloseTo(0);
    expect(res1?.[0][1]).toBe(0);
    expect(res1?.[0][2]).toBeCloseTo(0.4);
    expect(res1?.[1][0].x).toBeCloseTo(4);
    expect(res1?.[1][0].y).toBeCloseTo(10);
    expect(res1?.[1][1]).toBe(2);
    expect(res1?.[1][2]).toBeCloseTo(0.6);
  });

  test("should return intersection information: bezier segment", () => {
    const curves = [{ c1: { x: 3, y: -10 }, c2: { x: 7, y: 10 } }];

    const res0 = getCrossBezierPathAndSegment({ path, curves }, [
      { x: 0, y: -10 },
      { x: 10, y: -10 },
    ]);
    expect(res0).toHaveLength(0);

    const res1 = getCrossBezierPathAndSegment({ path, curves }, [
      { x: 0, y: -2 },
      { x: 10, y: -2 },
    ]);
    expect(res1).toHaveLength(2);
    expect(res1?.[0][0].x).toBeCloseTo(0.824);
    expect(res1?.[0][0].y).toBeCloseTo(-2);
    expect(res1?.[0][1]).toBe(0);
    expect(res1?.[0][2]).toBeCloseTo(0.089);
    expect(res1?.[1][0].x).toBeCloseTo(3.476);
    expect(res1?.[1][0].y).toBeCloseTo(-2);
    expect(res1?.[1][1]).toBe(0);
    expect(res1?.[1][2]).toBeCloseTo(0.354);
  });
});
