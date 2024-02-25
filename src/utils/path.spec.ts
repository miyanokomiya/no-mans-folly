import { describe, expect, test } from "vitest";
import { combineBezierPathAndPath, getCrossBezierPathAndSegment } from "./path";

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

  test("should complete the path when it has the curve param for closed segment", () => {
    const curves = [undefined, undefined, undefined, undefined];

    const res0 = getCrossBezierPathAndSegment({ path, curves }, [
      { x: -4, y: 5 },
      { x: 4, y: 5 },
    ]);
    expect(res0).toHaveLength(1);
    expect(res0[0]).toEqual([{ x: 0, y: 5 }, 3, 0.5]);
  });
});

describe("combineBezierPathAndPath", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  test("should combine bezier path and target path: both intersections are on the same straight segment", () => {
    const res0 = combineBezierPathAndPath(
      { path, curves: [] },
      [
        [{ x: 2, y: 0 }, 0, 0.2],
        [{ x: 8, y: 0 }, 0, 0.8],
      ],
      [{ x: 5, y: -10 }],
    );
    expect(res0.path).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 5, y: -10 },
      { x: 8, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
  });

  test("should combine bezier path and target path: each intersection is on unique straight segment", () => {
    const res0 = combineBezierPathAndPath(
      { path, curves: [] },
      [
        [{ x: 2, y: 0 }, 0, 0.2],
        [{ x: 10, y: 8 }, 1, 0.8],
      ],
      [{ x: 3, y: 7 }],
    );
    expect(res0.path).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 7 },
      { x: 10, y: 8 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 },
    ]);
  });

  test("should combine bezier path and target path: intersections cover the first and the last points", () => {
    const res0 = combineBezierPathAndPath(
      { path, curves: [] },
      [
        [{ x: 0, y: 8 }, 3, 0.2],
        [{ x: 2, y: 0 }, 0, 0.2],
      ],
      [{ x: -10, y: -10 }],
    );
    expect(res0.path).toEqual([
      { x: 0, y: 10 },
      { x: 0, y: 8 },
      { x: -10, y: -10 },
      { x: 2, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
  });

  const bezier = {
    path: [
      { x: 2, y: 0 },
      { x: 8, y: 0 },
      { x: 10, y: 2 },
      { x: 10, y: 8 },
      { x: 8, y: 10 },
      { x: 2, y: 10 },
      { x: 0, y: 8 },
      { x: 0, y: 2 },
    ],
    curves: [
      undefined,
      { c1: { x: 10, y: 0 }, c2: { x: 10, y: 0 } },
      undefined,
      { c1: { x: 10, y: 10 }, c2: { x: 10, y: 10 } },
      undefined,
      { c1: { x: 0, y: 10 }, c2: { x: 0, y: 10 } },
      undefined,
      { c1: { x: 0, y: 0 }, c2: { x: 0, y: 0 } },
    ],
  };

  test("should combine bezier path and target path: both intersections are on the same curve", () => {
    const res0 = combineBezierPathAndPath(
      bezier,
      [
        [{ x: 8.5, y: 0.25 }, 1, 0.5],
        [{ x: 9.5, y: 0.75 }, 1, 0.5],
      ],
      [{ x: 15, y: -5 }],
    );
    expect(res0.path).toEqual([
      { x: 2, y: 0 },
      { x: 8, y: 0 },
      { x: 8.5, y: 0.25 },
      { x: 15, y: -5 },
      { x: 9.5, y: 0.75 },
      { x: 10, y: 2 },
      { x: 10, y: 8 },
      { x: 8, y: 10 },
      { x: 2, y: 10 },
      { x: 0, y: 8 },
      { x: 0, y: 2 },
      { x: 2, y: 0 },
    ]);
    expect(res0.curves).toEqual([
      undefined,
      { c1: { x: 9, y: 0 }, c2: { x: 9.5, y: 0 } },
      undefined,
      undefined,
      { c1: { x: 10, y: 0.5 }, c2: { x: 10, y: 1 } },
      undefined,
      { c1: { x: 10, y: 10 }, c2: { x: 10, y: 10 } },
      undefined,
      { c1: { x: 0, y: 10 }, c2: { x: 0, y: 10 } },
      undefined,
      { c1: { x: 0, y: 0 }, c2: { x: 0, y: 0 } },
    ]);

    // Manually closed path shouldn't matter.
    const res1 = combineBezierPathAndPath(
      { path: [...bezier.path, bezier.path[0]], curves: bezier.curves },
      [
        [{ x: 8.5, y: 0.25 }, 1, 0.5],
        [{ x: 9.5, y: 0.75 }, 1, 0.5],
      ],
      [{ x: 15, y: -5 }],
    );
    expect(res1).toEqual(res0);
  });

  test("should combine bezier path and target path: one intersection is on a straight segment and another is on a curve", () => {
    const res0 = combineBezierPathAndPath(
      bezier,
      [
        [{ x: 5, y: 10 }, 4, 0.5],
        [{ x: 1, y: 9 }, 5, 0.5],
      ],
      [{ x: -2, y: 12 }],
    );
    expect(res0.path).toEqual([
      { x: 8, y: 10 },
      { x: 5, y: 10 },
      { x: -2, y: 12 },
      { x: 1, y: 9 },
      { x: 0, y: 8 },
      { x: 0, y: 2 },
      { x: 2, y: 0 },
      { x: 8, y: 0 },
      { x: 10, y: 2 },
      { x: 10, y: 8 },
      { x: 8, y: 10 },
    ]);
    expect(res0.curves).toEqual([
      undefined,
      undefined,
      undefined,
      { c1: { x: 0, y: 9.5 }, c2: { x: 0, y: 9 } },
      undefined,
      { c1: { x: 0, y: 0 }, c2: { x: 0, y: 0 } },
      undefined,
      { c1: { x: 10, y: 0 }, c2: { x: 10, y: 0 } },
      undefined,
      { c1: { x: 10, y: 10 }, c2: { x: 10, y: 10 } },
    ]);

    // Manually closed path shouldn't matter.
    const res1 = combineBezierPathAndPath(
      { path: [...bezier.path, bezier.path[0]], curves: bezier.curves },
      [
        [{ x: 5, y: 10 }, 4, 0.5],
        [{ x: 1, y: 9 }, 5, 0.5],
      ],
      [{ x: -2, y: 12 }],
    );
    expect(res1.path).toEqual([...res0.path.slice(0, 7), { x: 2, y: 0 }, ...res0.path.slice(7)]);
    expect(res1.curves).toEqual([...res0.curves.slice(0, 7), undefined, ...res0.curves.slice(7)]);
  });
});