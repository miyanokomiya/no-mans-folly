import { describe, expect, test } from "vitest";
import { mergetSnappingResult, newShapeIntervalSnapping, newShapeSnapping, SnappingResult } from "./shapeSnapping";
import { ShapeSnappingLines } from "../shapes/core";

describe("newShapeSnapping", () => {
  const shapeSnappingList = [
    [
      "a",
      {
        v: [
          [
            { x: 0, y: 100 },
            { x: 0, y: 0 },
          ],
          [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        ],
        h: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          [
            { x: 100, y: 100 },
            { x: 0, y: 100 },
          ],
        ],
      },
    ],
  ] as [string, ShapeSnappingLines][];
  const target = newShapeSnapping({ shapeSnappingList });

  test("x snapping: should return snapping result", () => {
    expect(target.test({ x: -15, y: 40, width: 10, height: 10 })).toEqual({
      diff: { x: 5, y: 0 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 0, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.test({ x: 5, y: 40, width: 10, height: 10 })).toEqual({
      diff: { x: -5, y: 0 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 0, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.test({ x: 95, y: 40, width: 30, height: 30 })).toEqual({
      diff: { x: 5, y: 0 },
      targets: [
        {
          id: "a",
          line: [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.test({ x: 105, y: 40, width: 10, height: 10 })).toEqual({
      diff: { x: -5, y: 0 },
      targets: [
        {
          id: "a",
          line: [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.test({ x: -7, y: 40, width: 10, height: 10 }), "at center").toEqual({
      diff: { x: 2, y: 0 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 0, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });
  });

  test("x snapping: should return all snapping targets having the save level", () => {
    expect(target.test({ x: 1, y: 40, width: 100, height: 10 })).toEqual({
      diff: { x: -1, y: 0 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 0, y: 100 },
          ],
        },
        {
          id: "a",
          line: [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });
  });

  test("y snapping: should return snapping result", () => {
    expect(target.test({ x: 40, y: -15, width: 10, height: 10 })).toEqual({
      diff: { x: 0, y: 5 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.test({ x: 40, y: 5, width: 10, height: 10 })).toEqual({
      diff: { x: 0, y: -5 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.test({ x: 40, y: 95, width: 30, height: 30 })).toEqual({
      diff: { x: 0, y: 5 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 100 },
            { x: 100, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.test({ x: 40, y: 105, width: 10, height: 10 })).toEqual({
      diff: { x: 0, y: -5 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 100 },
            { x: 100, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.test({ x: 40, y: -7, width: 10, height: 10 }), "at center").toEqual({
      diff: { x: 0, y: 2 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
      intervalTargets: [],
    });
  });

  test("y snapping: should return all snapping targets having the save level", () => {
    expect(target.test({ x: 40, y: 1, width: 10, height: 100 })).toEqual({
      diff: { x: 0, y: -1 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
        {
          id: "a",
          line: [
            { x: 0, y: 100 },
            { x: 100, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });
  });

  test("x y snapping: should return snapping result", () => {
    expect(target.test({ x: -15, y: -15, width: 10, height: 10 })).toEqual({
      diff: { x: 5, y: 5 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: -10 },
            { x: 0, y: 100 },
          ],
        },
        {
          id: "a",
          line: [
            { x: -10, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.test({ x: -5, y: -5, width: 30, height: 30 })).toEqual({
      diff: { x: 5, y: 5 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 0, y: 100 },
          ],
        },
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
      intervalTargets: [],
    });
  });

  test("grid snapping: should dealt with grid lines as well as shapes", () => {
    const targetGrid = newShapeSnapping({
      shapeSnappingList: [],
      gridSnapping: shapeSnappingList[0][1],
    });

    expect(targetGrid.test({ x: -15, y: -15, width: 10, height: 10 })).toEqual({
      diff: { x: 5, y: 5 },
      targets: [
        {
          id: "GRID",
          line: [
            { x: 0, y: -10 },
            { x: 0, y: 100 },
          ],
        },
        {
          id: "GRID",
          line: [
            { x: -10, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
      intervalTargets: [],
    });
  });
});

describe("newShapeIntervalSnapping", () => {
  const shapeSnappingList = [
    [
      "a",
      {
        v: [
          [
            { x: 0, y: 100 },
            { x: 0, y: 0 },
          ],
          [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        ],
        h: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          [
            { x: 100, y: 100 },
            { x: 0, y: 100 },
          ],
        ],
      },
    ],
    [
      "b",
      {
        v: [
          [
            { x: 150, y: 0 },
            { x: 150, y: 100 },
          ],
          [
            { x: 250, y: 100 },
            { x: 250, y: 0 },
          ],
        ],
        h: [
          [
            { x: 150, y: 0 },
            { x: 250, y: 0 },
          ],
          [
            { x: 250, y: 100 },
            { x: 150, y: 100 },
          ],
        ],
      },
    ],
    [
      "c",
      {
        v: [
          [
            { x: 0, y: 150 },
            { x: 0, y: 250 },
          ],
          [
            { x: 100, y: 250 },
            { x: 100, y: 150 },
          ],
        ],
        h: [
          [
            { x: 0, y: 150 },
            { x: 100, y: 150 },
          ],
          [
            { x: 100, y: 250 },
            { x: 0, y: 250 },
          ],
        ],
      },
    ],
    [
      "d",
      {
        v: [
          [
            { x: 150, y: 150 },
            { x: 150, y: 250 },
          ],
          [
            { x: 250, y: 150 },
            { x: 250, y: 250 },
          ],
        ],
        h: [
          [
            { x: 150, y: 150 },
            { x: 250, y: 150 },
          ],
          [
            { x: 150, y: 250 },
            { x: 250, y: 250 },
          ],
        ],
      },
    ],
  ] as [string, ShapeSnappingLines][];

  const target = newShapeIntervalSnapping({ shapeSnappingList: [shapeSnappingList[0], shapeSnappingList[1]] });

  test("x snapping: should return snapping result", () => {
    expect(target.test({ x: -70, y: 0, width: 10, height: 10 }), "left side").toEqual({
      v: {
        d: 10,
        ad: 10,
        target: {
          direction: "v",
          beforeId: "a",
          afterId: "b",
          lines: [
            [
              { x: -50, y: 5 },
              { x: 0, y: 5 },
            ],
            [
              { x: 100, y: 5 },
              { x: 150, y: 5 },
            ],
          ],
        },
      },
    });

    expect(target.test({ x: 310, y: 0, width: 10, height: 10 }), "right side").toEqual({
      v: {
        d: -10,
        ad: 10,
        target: {
          direction: "v",
          beforeId: "a",
          afterId: "b",
          lines: [
            [
              { x: 100, y: 5 },
              { x: 150, y: 5 },
            ],
            [
              { x: 250, y: 5 },
              { x: 300, y: 5 },
            ],
          ],
        },
      },
    });

    expect(target.test({ x: 110, y: 0, width: 10, height: 10 }), "between").toEqual({
      v: {
        d: 10,
        ad: 10,
        target: {
          direction: "v",
          beforeId: "a",
          afterId: "b",
          lines: [
            [
              { x: 100, y: 5 },
              { x: 120, y: 5 },
            ],
            [
              { x: 130, y: 5 },
              { x: 150, y: 5 },
            ],
          ],
        },
      },
    });

    expect(target.test({ x: 130, y: 0, width: 10, height: 10 }), "between").toEqual({
      v: {
        d: -10,
        ad: 10,
        target: {
          direction: "v",
          beforeId: "a",
          afterId: "b",
          lines: [
            [
              { x: 100, y: 5 },
              { x: 120, y: 5 },
            ],
            [
              { x: 130, y: 5 },
              { x: 150, y: 5 },
            ],
          ],
        },
      },
    });
  });

  const target1 = newShapeIntervalSnapping({ shapeSnappingList: [shapeSnappingList[0], shapeSnappingList[2]] });

  test("y snapping: should return snapping result", () => {
    expect(target1.test({ x: 0, y: -70, width: 10, height: 10 }), "top side").toEqual({
      h: {
        d: 10,
        ad: 10,
        target: {
          direction: "h",
          beforeId: "a",
          afterId: "c",
          lines: [
            [
              { x: 5, y: -50 },
              { x: 5, y: 0 },
            ],
            [
              { x: 5, y: 100 },
              { x: 5, y: 150 },
            ],
          ],
        },
      },
    });

    expect(target1.test({ x: 0, y: 310, width: 10, height: 10 }), "bottom side").toEqual({
      h: {
        d: -10,
        ad: 10,
        target: {
          direction: "h",
          beforeId: "a",
          afterId: "c",
          lines: [
            [
              { y: 100, x: 5 },
              { y: 150, x: 5 },
            ],
            [
              { y: 250, x: 5 },
              { y: 300, x: 5 },
            ],
          ],
        },
      },
    });

    expect(target1.test({ x: 0, y: 110, width: 10, height: 10 }), "between").toEqual({
      h: {
        d: 10,
        ad: 10,
        target: {
          direction: "h",
          beforeId: "a",
          afterId: "c",
          lines: [
            [
              { y: 100, x: 5 },
              { y: 120, x: 5 },
            ],
            [
              { y: 130, x: 5 },
              { y: 150, x: 5 },
            ],
          ],
        },
      },
    });

    expect(target1.test({ x: 0, y: 130, width: 10, height: 10 }), "between").toEqual({
      h: {
        d: -10,
        ad: 10,
        target: {
          direction: "h",
          beforeId: "a",
          afterId: "c",
          lines: [
            [
              { y: 100, x: 5 },
              { y: 120, x: 5 },
            ],
            [
              { y: 130, x: 5 },
              { y: 150, x: 5 },
            ],
          ],
        },
      },
    });
  });

  test("should not regard pairs of shapes that don't overlap each other when the setting is set true", () => {
    const target1 = newShapeIntervalSnapping({ shapeSnappingList: [shapeSnappingList[0], shapeSnappingList[3]] });
    expect(target1.test({ x: 298, y: 0, width: 0, height: 0 })).toEqual({
      v: {
        d: 2,
        ad: 2,
        target: {
          direction: "v",
          beforeId: "a",
          afterId: "d",
          lines: [
            [
              { x: 100, y: 0 },
              { x: 150, y: 0 },
            ],
            [
              { x: 250, y: 0 },
              { x: 300, y: 0 },
            ],
          ],
        },
      },
    });

    const target2 = newShapeIntervalSnapping({
      shapeSnappingList: [shapeSnappingList[0], shapeSnappingList[3]],
      settings: { snapIgnoreNonoverlapPair: "on" },
    });
    expect(target2.test({ x: 298, y: 0, width: 0, height: 0 })).toBe(undefined);
  });
});

describe("testPoint", () => {
  const shapeSnappingList = [
    [
      "a",
      {
        v: [
          [
            { x: 0, y: 100 },
            { x: 0, y: 0 },
          ],
          [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        ],
        h: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          [
            { x: 100, y: 100 },
            { x: 0, y: 100 },
          ],
        ],
      },
    ],
  ] as [string, ShapeSnappingLines][];
  const target = newShapeSnapping({ shapeSnappingList });

  test("should snap to shapes either vertically or horizontally", () => {
    expect(target.testPoint({ x: 1, y: 10 })).toEqual({
      diff: { x: -1, y: 0 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 0, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.testPoint({ x: 10, y: 1 })).toEqual({
      diff: { x: 0, y: -1 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
      intervalTargets: [],
    });

    expect(target.testPoint({ x: -1, y: 1 })).toEqual({
      diff: { x: 1, y: -1 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 0, y: 100 },
          ],
        },
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
      intervalTargets: [],
    });
  });
});

describe("testPointOnLine", () => {
  const shapeSnappingList = [
    [
      "a",
      {
        v: [
          [
            { x: 0, y: 100 },
            { x: 0, y: 0 },
          ],
          [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        ],
        h: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          [
            { x: 100, y: 100 },
            { x: 0, y: 100 },
          ],
        ],
      },
    ],
  ] as [string, ShapeSnappingLines][];
  const target = newShapeSnapping({ shapeSnappingList });

  test("should snap to shapes either vertically or horizontally on the line", () => {
    expect(
      target.testPointOnLine({ x: 19, y: 1 }, [
        { x: 0, y: -20 },
        { x: 100, y: 80 },
      ]),
    ).toEqual({
      diff: { x: 1, y: -1 },
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
      intervalTargets: [],
    });
  });

  test("should ignore grid lines parallel to the line", () => {
    expect(
      target.testPointOnLine({ x: 19, y: 1 }, [
        { x: 20, y: 0 },
        { x: 120, y: 0 },
      ]),
    ).toEqual(undefined);
    expect(
      target.testPointOnLine({ x: 99, y: 1 }, [
        { x: 20, y: 0 },
        { x: 120, y: 0 },
      ]),
    ).toEqual({
      diff: { x: 1, y: -1 },
      targets: [
        {
          id: "a",
          line: [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    });
  });

  test("should snap to an interval position on the line", () => {
    const shapeSnappingList2 = shapeSnappingList.concat([
      [
        "b",
        {
          v: [
            [
              { x: 120, y: 100 },
              { x: 120, y: 0 },
            ],
            [
              { x: 220, y: 0 },
              { x: 220, y: 100 },
            ],
          ],
          h: [
            [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
            ],
            [
              { x: 100, y: 100 },
              { x: 0, y: 100 },
            ],
          ],
        },
      ],
    ]);
    const target = newShapeSnapping({ shapeSnappingList: shapeSnappingList2 });
    expect(
      target.testPointOnLine({ x: 238, y: -19 }, [
        { x: 200, y: -60 },
        { x: 300, y: 40 },
      ]),
    ).toEqual({
      diff: { x: 2, y: -1 },
      targets: [],
      intervalTargets: [
        {
          beforeId: "a",
          afterId: "b",
          direction: "v",
          lines: [
            [
              { x: 100, y: -19 },
              { x: 120, y: -19 },
            ],
            [
              { x: 220, y: -19 },
              { x: 240, y: -19 },
            ],
          ],
        },
      ],
    });
  });
});

describe("mergetSnappingResult", () => {
  test("should merge two snapping results in each axis", () => {
    const a: SnappingResult = {
      diff: { x: 1, y: 20 },
      targets: [
        {
          id: "a1",
          line: [
            { x: 1, y: 0 },
            { x: 1, y: 10 },
          ],
        },
        {
          id: "a2",
          line: [
            { x: 0, y: 20 },
            { x: 10, y: 20 },
          ],
        },
      ],
      intervalTargets: [
        {
          beforeId: "ab1",
          afterId: "aa1",
          lines: [
            [
              { x: 1, y: 0 },
              { x: 5, y: 0 },
            ],
          ],
          direction: "h",
        },
        {
          beforeId: "ab2",
          afterId: "aa2",
          lines: [
            [
              { x: 0, y: 20 },
              { x: 0, y: 25 },
            ],
          ],
          direction: "v",
        },
      ],
    };
    const b: SnappingResult = {
      diff: { x: -20, y: -2 },
      targets: [
        {
          id: "b1",
          line: [
            { x: -20, y: 0 },
            { x: -20, y: 10 },
          ],
        },
        {
          id: "b2",
          line: [
            { x: 0, y: -2 },
            { x: 10, y: -2 },
          ],
        },
      ],
      intervalTargets: [
        {
          beforeId: "bb1",
          afterId: "ba1",
          lines: [
            [
              { x: -20, y: 0 },
              { x: -5, y: 0 },
            ],
          ],
          direction: "h",
        },
        {
          beforeId: "bb2",
          afterId: "ba2",
          lines: [
            [
              { x: 0, y: -2 },
              { x: 0, y: 5 },
            ],
          ],
          direction: "v",
        },
      ],
    };

    expect(mergetSnappingResult(a, b)).toEqual({
      diff: { x: 1, y: -2 },
      targets: [
        {
          id: "a1",
          line: [
            { x: 1, y: 0 },
            { x: 1, y: 10 },
          ],
        },
        {
          id: "b2",
          line: [
            { x: 0, y: -2 },
            { x: 10, y: -2 },
          ],
        },
      ],
      intervalTargets: [
        {
          beforeId: "ab1",
          afterId: "aa1",
          lines: [
            [
              { x: 1, y: 0 },
              { x: 5, y: 0 },
            ],
          ],
          direction: "h",
        },
        {
          beforeId: "bb2",
          afterId: "ba2",
          lines: [
            [
              { x: 0, y: -2 },
              { x: 0, y: 5 },
            ],
          ],
          direction: "v",
        },
      ],
    });
  });
});
