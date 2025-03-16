import { describe, expect, test } from "vitest";
import {
  combineBezierPathAndPath,
  convertLinePathToSimplePath,
  covertArcToBezier,
  covertEllipseToBezier,
  flipBezierPathV,
  getBezierControlForArc,
  getClosestPointOnPolyline,
  getCornerRadiusArc,
  getCrossBezierPathAndSegment,
  getIntersectionsBetweenLineAndPolyline,
  getIntersectionsBetweenSegAndPolyline,
  getPolylineEdgeInfo,
  getSegmentVicinityFrom,
  getSegmentVicinityTo,
  getWavePathControl,
  isArcControl,
  isBezieirControl,
  reverseBezierPath,
  shiftBezierCurveControl,
  transformBezierCurveControl,
  transformBezierPath,
} from "./path";
import { getBezierBounds, getSegments, ISegment } from "./geometry";
import { getArcLerpFn, getDistance, getPedal, rotate } from "okageo";

describe("isBezieirControl", () => {
  test("should return true iff the control is of bezier", () => {
    expect(isBezieirControl(undefined)).toBe(false);
    expect(isBezieirControl({ d: { x: 0, y: 0 } })).toBe(false);
    expect(isBezieirControl({ c1: { x: 0, y: 0 }, c2: { x: 0, y: 0 } })).toBe(true);
  });
});

describe("isArcControl", () => {
  test("should return true iff the control is of arc", () => {
    expect(isArcControl(undefined)).toBe(false);
    expect(isArcControl({ d: { x: 0, y: 0 } })).toBe(true);
    expect(isArcControl({ c1: { x: 0, y: 0 }, c2: { x: 0, y: 0 } })).toBe(false);
  });
});

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

describe("getWavePathControl", () => {
  test("should return curve control for wave", () => {
    const p = { x: 0, y: 0 };
    const q = { x: 10, y: 0 };
    const res0 = getWavePathControl(p, q, 5);
    const bounds0 = getBezierBounds(p, q, res0.c1, res0.c2);
    expect(bounds0.x).toBeCloseTo(0);
    expect(bounds0.y).toBeCloseTo(-2.5);
    expect(bounds0.width).toBeCloseTo(10);
    expect(bounds0.height).toBeCloseTo(5);

    const q1 = { x: 0, y: 10 };
    const res1 = getWavePathControl(p, q1, 5);
    const bounds1 = getBezierBounds(p, q1, res1.c1, res1.c2);
    expect(bounds1.x).toBeCloseTo(-2.5);
    expect(bounds1.y).toBeCloseTo(0);
    expect(bounds1.width).toBeCloseTo(5);
    expect(bounds1.height).toBeCloseTo(10);
  });
});

describe("getCornerRadiusArc", () => {
  test("should return corner point when the corner isn't rounded", () => {
    const p1 = { x: 0, y: 0 };
    expect(getCornerRadiusArc({ x: 0, y: 0 }, p1, { x: 0, y: 10 }, 4)).toEqual([p1, p1, p1]);
    expect(getCornerRadiusArc({ x: -10, y: 0 }, p1, { x: 0, y: 10 }, 0)).toEqual([p1, p1, p1]);
  });
  test("should return arc info of the corner radius", () => {
    expect(getCornerRadiusArc({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, 3)).toEqualPoints([
      { x: 7, y: 3 },
      { x: 7, y: 0 },
      { x: 10, y: 3 },
    ]);

    const res1 = getCornerRadiusArc({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }, 3);
    expect(
      getDistance(
        res1[0],
        getPedal(res1[0], [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ]),
      ),
    ).toBeCloseTo(3);
    expect(
      getDistance(
        res1[0],
        getPedal(res1[0], [
          { x: 10, y: 0 },
          { x: 0, y: 10 },
        ]),
      ),
    ).toBeCloseTo(3);
  });
  test("should restrict radius up to the minimum length of edges", () => {
    expect(getCornerRadiusArc({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, 20)).toEqualPoints([
      { x: 0, y: 10 },
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]);
  });
});

describe("getBezierControlForArc", () => {
  test("should avoid zero division", () => {
    const p = { x: 10, y: 10 };
    const res0 = getBezierControlForArc({ x: 0, y: 0 }, p, p);
    expect(res0.c1).toEqual(p);
    expect(res0.c2).toEqual(p);
  });

  test("should return bezier control to approximate the arc", () => {
    const res0 = getBezierControlForArc({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 });
    expect(res0.c1.x).toBeCloseTo(10);
    expect(res0.c1.y).toBeCloseTo(5.523);
    expect(res0.c2.x).toBeCloseTo(5.523);
    expect(res0.c2.y).toBeCloseTo(10);
  });
});

describe("shiftBezierCurveControl", () => {
  test("should shift the control", () => {
    const res0 = shiftBezierCurveControl({ c1: { x: 0, y: 0 }, c2: { x: 10, y: 20 } }, { x: 100, y: 200 });
    expect(res0.c1).toEqualPoint({ x: 100, y: 200 });
    expect(res0.c2).toEqualPoint({ x: 110, y: 220 });
  });
});

describe("transformBezierPath", () => {
  test("should transform the path", () => {
    const bezier = {
      path: [
        { x: 2, y: 0 },
        { x: 8, y: 0 },
        { x: 10, y: 2 },
        { x: 10, y: 8 },
      ],
      curves: [undefined, { c1: { x: 10, y: 1 }, c2: { x: 10, y: 2 } }, undefined],
    };
    expect(transformBezierPath(bezier, [2, 0, 0, 3, 0, 0])).toEqual({
      path: [
        { x: 4, y: 0 },
        { x: 16, y: 0 },
        { x: 20, y: 6 },
        { x: 20, y: 24 },
      ],
      curves: [undefined, { c1: { x: 20, y: 3 }, c2: { x: 20, y: 6 } }, undefined],
    });
  });
});

describe("transformBezierCurveControl", () => {
  test("should shift the control", () => {
    const res0 = transformBezierCurveControl({ c1: { x: 10, y: 20 }, c2: { x: 100, y: 200 } }, [2, 0, 0, 3, 0, 0]);
    expect(res0.c1).toEqualPoint({ x: 20, y: 60 });
    expect(res0.c2).toEqualPoint({ x: 200, y: 600 });
  });
});

describe("getSegmentVicinityFrom", () => {
  test("should return a vicinity of the head point", () => {
    const seg: ISegment = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(getSegmentVicinityFrom(seg, { d: { x: 5, y: 5 } })).toEqualPoint({
      x: 0.002467198171341778,
      y: 0.15705379539064118,
    });
  });

  test("should specify the distance of between the vicinity and the head point", () => {
    const seg: ISegment = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(getSegmentVicinityFrom(seg, undefined, 3)).toEqualPoint({ x: 3, y: 0 });

    const seg1: ISegment = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(getSegmentVicinityFrom(seg1, undefined, 3)).toEqualPoint({ x: 3, y: 0 });
  });
});

describe("getSegmentVicinityTo", () => {
  test("should return a vicinity of the tail point", () => {
    const seg: ISegment = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(getSegmentVicinityTo(seg, { d: { x: 5, y: 5 } })).toEqualPoint({
      x: 9.997532801828658,
      y: 0.1570537953906416,
    });
  });

  test("should specify the distance of between the vicinity and the tail point", () => {
    const seg: ISegment = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(getSegmentVicinityTo(seg, undefined, 3)).toEqualPoint({ x: 7, y: 0 });
  });
});

describe("getPolylineEdgeInfo", () => {
  test("should return lerp function based on distance", () => {
    const target = getPolylineEdgeInfo(
      getSegments([
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ]),
      [{ c1: { x: 50, y: 150 }, c2: { x: 150, y: 150 } }],
    );
    expect(target.lerpFn(80 / target.totalLength)).toEqualPoint({ x: 34.99598644197986, y: 71.72119092860004 });
  });
});

describe("getClosestPointOnPolyline", () => {
  test("should return the closest outline info if exists", () => {
    const edgeInfo = getPolylineEdgeInfo(
      getSegments([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
    );
    expect(getClosestPointOnPolyline(edgeInfo, { x: 40, y: 11 }, 10)).toEqual(undefined);
    expect(getClosestPointOnPolyline(edgeInfo, { x: 40, y: 9 }, 10)).toEqual([{ x: 40, y: 0 }, 0.4]);
  });

  test("should regard bezier segment", () => {
    const edgeInfo = getPolylineEdgeInfo(
      getSegments([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
      [{ c1: { x: 20, y: 20 }, c2: { x: 80, y: 20 } }],
    );
    const result0 = getClosestPointOnPolyline(edgeInfo, { x: 40, y: 9 }, 10);
    expect(result0?.[0]).toEqualPoint({ x: 39.70631055859311, y: 14.55409224224895 });
    expect(result0?.[1]).toBeCloseTo(0.4);
  });

  test("should regard arc segment", () => {
    const edgeInfo = getPolylineEdgeInfo(
      getSegments([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
      [{ d: { x: 0, y: 20 } }],
    );
    const result0 = getClosestPointOnPolyline(edgeInfo, { x: 40, y: 18 }, 10);
    expect(result0?.[0]).toEqualPoint({ x: 39.90006665667716, y: 19.293045251336395 });
    expect(result0?.[1]).toBeCloseTo(0.4081723);
  });
});

describe("getIntersectionsBetweenLineAndPolyline", () => {
  test("should return intersections between line shape and a line", () => {
    const res0 = getIntersectionsBetweenLineAndPolyline(
      [
        { x: 10, y: 10 },
        { x: 10, y: 30 },
      ],
      getSegments([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 20 },
        { x: 0, y: 20 },
      ]),
    );
    expect(res0, "straight").toEqualPoints([
      { x: 10, y: 0 },
      { x: 10, y: 20 },
    ]);

    const res1 = getIntersectionsBetweenLineAndPolyline(
      [
        { x: 50, y: -20 },
        { x: 50, y: 20 },
      ],
      getSegments([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
      [{ d: { x: 0, y: 50 } }],
    );
    expect(res1, "arc").toEqualPoints([{ x: 50, y: 50 }]);

    const res2 = getIntersectionsBetweenLineAndPolyline(
      [
        { x: 50, y: -20 },
        { x: 50, y: 20 },
      ],
      getSegments([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
      [{ c1: { x: 0, y: 50 }, c2: { x: 100, y: 50 } }],
    );
    expect(res2, "bezier").toEqualPoints([{ x: 50, y: 37.5 }]);
  });

  test("should treat invalid arc as straight segment", () => {
    const res0 = getIntersectionsBetweenLineAndPolyline(
      [
        { x: 10, y: -20 },
        { x: 10, y: 20 },
      ],
      getSegments([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
      [{ d: { x: 0, y: 0 } }],
    );
    expect(res0, "straight").toEqualPoints([{ x: 10, y: 0 }]);
  });
});

describe("getIntersectionsBetweenSegAndPolyline", () => {
  test("should exclude intersections outside the segment", () => {
    const res0 = getIntersectionsBetweenSegAndPolyline(
      [
        { x: 10, y: 10 },
        { x: 10, y: 30 },
      ],
      getSegments([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 20 },
        { x: 0, y: 20 },
      ]),
    );
    expect(res0).toEqualPoints([{ x: 10, y: 20 }]);
  });
});

describe("reverseBezierPath", () => {
  test("should reverse bezier path", () => {
    expect(
      reverseBezierPath({
        path: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
        curves: [undefined, { c1: { x: 120, y: 20 }, c2: { x: 120, y: 80 } }],
      }),
    ).toEqual({
      path: [
        { x: 100, y: 100 },
        { x: 100, y: 0 },
        { x: 0, y: 0 },
      ],
      curves: [{ c1: { x: 120, y: 80 }, c2: { x: 120, y: 20 } }, undefined],
    });
  });
});

describe("flipBezierPathV", () => {
  test("should flip bezier path vertically", () => {
    expect(
      flipBezierPathV(
        {
          path: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
          curves: [undefined, { c1: { x: 120, y: 20 }, c2: { x: 120, y: 80 } }],
        },
        100,
      ),
    ).toEqual({
      path: [
        { x: 0, y: 200 },
        { x: 100, y: 200 },
        { x: 100, y: 100 },
      ],
      curves: [undefined, { c1: { x: 120, y: 180 }, c2: { x: 120, y: 120 } }],
    });
  });
});

describe("convertLinePathToSimplePath", () => {
  test("should convert line path to simple path", () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const result = convertLinePathToSimplePath(vertices, [{ d: { x: 0, y: 50 } }]);
    const arcLerpFn = getArcLerpFn(50, 50, vertices[0], vertices[1], false, false, 0);
    expect(result.path).toEqualPoints([
      vertices[0],
      arcLerpFn(1 / 4),
      arcLerpFn(2 / 4),
      arcLerpFn(3 / 4),
      vertices[1],
      vertices[2],
    ]);
    expect(result.curves).toHaveLength(5);
  });
});

describe("covertArcToBezier", () => {
  test("should convert arc path to bezier path", () => {
    const seg: ISegment = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const result = covertArcToBezier(seg, { d: { x: 0, y: 50 } });
    const arcLerpFn = getArcLerpFn(50, 50, seg[0], seg[1], false, false, 0);
    expect(result.path).toEqualPoints([seg[0], arcLerpFn(1 / 4), arcLerpFn(2 / 4), arcLerpFn(3 / 4), seg[1]]);
    expect(result.curves).toHaveLength(4);
  });
});

describe("covertEllipseToBezier", () => {
  test("should convert ellipse to bezier path", () => {
    const center = { x: 50, y: 20 };
    const rx = 50;
    const ry = 20;
    const rotation = 0;
    const result = covertEllipseToBezier(center, rx, ry, rotation, -Math.PI, Math.PI);
    expect(result.path).toHaveLength(5);
    expect(result.curves).toHaveLength(4);
    expect(result.path[0], "closed path").toEqualPoint(result.path.at(-1)!);
    expect(result.path[0]).toEqualPoint({ x: 0, y: 20 });
    expect(result.path[1]).toEqualPoint({ x: 50, y: 0 });
    expect(result.path[2]).toEqualPoint({ x: 100, y: 20 });
    expect(result.path[3]).toEqualPoint({ x: 50, y: 40 });
    expect(result.path.at(-1)).toEqualPoint({ x: 0, y: 20 });
    expect(result.curves[0]?.c1).toEqualPoint({ x: 0, y: 8.954305 });
    expect(result.curves[0]?.c2).toEqualPoint({ x: 22.3857625, y: 0 });
  });

  test("should handle angle range", () => {
    const center = { x: 50, y: 20 };
    const rx = 50;
    const ry = 20;
    const rotation = 0;
    const result = covertEllipseToBezier(center, rx, ry, rotation, -Math.PI / 2, Math.PI / 2);
    expect(result.path).toHaveLength(5);
    expect(result.curves).toHaveLength(4);
    expect(result.path[0]).toEqualPoint({ x: 50, y: 0 });
    expect(result.path[1].x).toBeGreaterThan(75);
    expect(result.path[2]).toEqualPoint({ x: 100, y: 20 });
    expect(result.path.at(-1)).toEqualPoint({ x: 50, y: 40 });
  });

  test("should handle counterclockwise", () => {
    const center = { x: 50, y: 20 };
    const rx = 50;
    const ry = 20;
    const rotation = 0;
    const result = covertEllipseToBezier(center, rx, ry, rotation, -Math.PI / 2, Math.PI / 2, true);
    expect(result.path).toHaveLength(5);
    expect(result.curves).toHaveLength(4);
    expect(result.path[0]).toEqualPoint({ x: 50, y: 0 });
    expect(result.path[1].x).toBeLessThan(25);
    expect(result.path[2]).toEqualPoint({ x: 0, y: 20 });
    expect(result.path.at(-1)).toEqualPoint({ x: 50, y: 40 });
  });

  test("should handle rotation", () => {
    const center = { x: 50, y: 20 };
    const rx = 50;
    const ry = 20;
    const rotation = Math.PI / 4;
    const result = covertEllipseToBezier(center, rx, ry, rotation, -Math.PI, Math.PI);
    expect(result.path).toHaveLength(5);
    expect(result.curves).toHaveLength(4);
    expect(result.path[0], "closed path").toEqualPoint(result.path.at(-1)!);
    expect(result.curves[0]?.c1).toEqualPoint(rotate({ x: 0, y: 8.954305 }, Math.PI / 4, center));
    expect(result.curves[0]?.c2).toEqualPoint(rotate({ x: 22.3857625, y: 0 }, Math.PI / 4, center));
  });

  test("should handle zero radii", () => {
    const center = { x: 50, y: 50 };
    const result1 = covertEllipseToBezier(center, 0, 10, 0, -Math.PI, Math.PI);
    expect(result1.path).toEqualPoints([
      { x: 50, y: 40 },
      { x: 50, y: 60 },
    ]);
    expect(result1.curves).toHaveLength(0);

    const result2 = covertEllipseToBezier(center, 10, 0, 0, -Math.PI, Math.PI);
    expect(result2.path).toEqualPoints([
      { x: 40, y: 50 },
      { x: 60, y: 50 },
    ]);
    expect(result2.curves).toHaveLength(0);
  });
});
