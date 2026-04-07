import { describe, expect, test } from "vitest";
import {
  getGuidelinesFromSnappingResult,
  newShapeIntervalSnapping,
  newShapeSnapping,
  optimizeSnappingTargetInfoForPoint,
} from "./shapeSnapping";
import { ShapeSnappingLines } from "../shapes/core";

describe("newShapeSnapping", () => {
  const shapeSnappingList = [
    [
      "a",
      {
        linesByRotation: new Map([
          [
            Math.PI / 2,
            [
              [
                { x: 0, y: 100 },
                { x: 0, y: 0 },
              ],
              [
                { x: 100, y: 0 },
                { x: 100, y: 100 },
              ],
            ],
          ],
          [
            0,
            [
              [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
              ],
              [
                { x: 100, y: 100 },
                { x: 0, y: 100 },
              ],
            ],
          ],
        ]),
      },
    ],
  ] as [string, ShapeSnappingLines][];
  const target = newShapeSnapping({ shapeSnappingList });

  test("x snapping: should return snapping result", () => {
    expect(target.test({ rect: { x: -15, y: 40, width: 10, height: 10 } })).toEqual({
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
      anchorPoints: [
        { x: 0, y: 40 },
        { x: 0, y: 50 },
      ],
    });

    expect(target.test({ rect: { x: 5, y: 40, width: 10, height: 10 } })).toEqual({
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
      anchorPoints: [
        { x: 0, y: 40 },
        { x: 0, y: 50 },
      ],
    });

    expect(target.test({ rect: { x: 95, y: 40, width: 30, height: 30 } })).toEqual({
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
      anchorPoints: [
        { x: 100, y: 40 },
        { x: 100, y: 70 },
      ],
    });

    expect(target.test({ rect: { x: 105, y: 40, width: 10, height: 10 } })).toEqual({
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
      anchorPoints: [
        { x: 100, y: 40 },
        { x: 100, y: 50 },
      ],
    });

    expect(target.test({ rect: { x: -7, y: 40, width: 10, height: 10 } }), "at center").toEqual({
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
      anchorPoints: [{ x: 0, y: 45 }],
    });
  });

  test("x snapping: should return all snapping targets having the save level", () => {
    expect(target.test({ rect: { x: 1, y: 40, width: 100, height: 10 } })).toEqual({
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
      anchorPoints: [
        { x: 0, y: 40 },
        { x: 100, y: 40 },
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ],
    });
  });

  test("y snapping: should return snapping result", () => {
    expect(target.test({ rect: { x: 40, y: -15, width: 10, height: 10 } })).toEqual({
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
      anchorPoints: [
        { x: 40, y: 0 },
        { x: 50, y: 0 },
      ],
    });

    expect(target.test({ rect: { x: 40, y: 5, width: 10, height: 10 } })).toEqual({
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
      anchorPoints: [
        { x: 40, y: 0 },
        { x: 50, y: 0 },
      ],
    });

    expect(target.test({ rect: { x: 40, y: 95, width: 30, height: 30 } })).toEqual({
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
      anchorPoints: [
        { x: 40, y: 100 },
        { x: 70, y: 100 },
      ],
    });

    expect(target.test({ rect: { x: 40, y: 105, width: 10, height: 10 } })).toEqual({
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
      anchorPoints: [
        { x: 40, y: 100 },
        { x: 50, y: 100 },
      ],
    });

    expect(target.test({ rect: { x: 40, y: -7, width: 10, height: 10 } }), "at center").toEqual({
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
      anchorPoints: [{ x: 45, y: 0 }],
    });
  });

  test("y snapping: should return all snapping targets having the save level", () => {
    expect(target.test({ rect: { x: 40, y: 1, width: 10, height: 100 } })).toEqual({
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
      anchorPoints: [
        { x: 40, y: 0 },
        { x: 50, y: 0 },
        { x: 40, y: 100 },
        { x: 50, y: 100 },
      ],
    });
  });

  test("x y snapping: should return snapping result", () => {
    expect(target.test({ rect: { x: -15, y: -15, width: 10, height: 10 } })).toEqual({
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
      anchorPoints: [
        { x: 0, y: -10 },
        { x: -10, y: 0 },
        { x: 0, y: 0 },
      ],
    });

    expect(target.test({ rect: { x: -5, y: -5, width: 30, height: 30 } })).toEqual({
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
      anchorPoints: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 0, y: 30 },
      ],
    });
  });

  test("grid snapping: should dealt with grid lines as well as shapes", () => {
    const targetGrid = newShapeSnapping({
      shapeSnappingList: [],
      gridSnapping: shapeSnappingList[0][1],
    });

    expect(targetGrid.test({ rect: { x: -15, y: -15, width: 10, height: 10 } })).toEqual({
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
      anchorPoints: [
        { x: 0, y: -10 },
        { x: -10, y: 0 },
        { x: 0, y: 0 },
      ],
    });
  });
});

describe("newShapeIntervalSnapping", () => {
  const shapeSnappingList = [
    [
      "a",
      {
        linesByRotation: new Map([
          [
            Math.PI / 2,
            [
              [
                { x: 0, y: 100 },
                { x: 0, y: 0 },
              ],
              [
                { x: 100, y: 0 },
                { x: 100, y: 100 },
              ],
            ],
          ],
          [
            0,
            [
              [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
              ],
              [
                { x: 100, y: 100 },
                { x: 0, y: 100 },
              ],
            ],
          ],
        ]),
      },
    ],
    [
      "b",
      {
        linesByRotation: new Map([
          [
            Math.PI / 2,
            [
              [
                { x: 150, y: 0 },
                { x: 150, y: 100 },
              ],
              [
                { x: 250, y: 100 },
                { x: 250, y: 0 },
              ],
            ],
          ],
          [
            0,
            [
              [
                { x: 150, y: 0 },
                { x: 250, y: 0 },
              ],
              [
                { x: 250, y: 100 },
                { x: 150, y: 100 },
              ],
            ],
          ],
        ]),
      },
    ],
    [
      "c",
      {
        linesByRotation: new Map([
          [
            Math.PI / 2,
            [
              [
                { x: 0, y: 150 },
                { x: 0, y: 250 },
              ],
              [
                { x: 100, y: 250 },
                { x: 100, y: 150 },
              ],
            ],
          ],
          [
            0,
            [
              [
                { x: 0, y: 150 },
                { x: 100, y: 150 },
              ],
              [
                { x: 100, y: 250 },
                { x: 0, y: 250 },
              ],
            ],
          ],
        ]),
      },
    ],
    [
      "d",
      {
        linesByRotation: new Map([
          [
            Math.PI / 2,
            [
              [
                { x: 150, y: 150 },
                { x: 150, y: 250 },
              ],
              [
                { x: 250, y: 150 },
                { x: 250, y: 250 },
              ],
            ],
          ],
          [
            0,
            [
              [
                { x: 150, y: 150 },
                { x: 250, y: 150 },
              ],
              [
                { x: 150, y: 250 },
                { x: 250, y: 250 },
              ],
            ],
          ],
        ]),
      },
    ],
  ] as [string, ShapeSnappingLines][];

  const target = newShapeIntervalSnapping({ shapeSnappingList: [shapeSnappingList[0], shapeSnappingList[1]] });

  test("x snapping: should return snapping result", () => {
    expect(target.test({ x: -68, y: 0, width: 10, height: 10 }), "left side").toEqual({
      v: {
        d: 8,
        ad: 8,
        target: {
          direction: "v",
          pairs: [["a", "b"]],
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

    expect(target.test({ x: 308, y: 0, width: 10, height: 10 }), "right side").toEqual({
      v: {
        d: -8,
        ad: 8,
        target: {
          direction: "v",
          pairs: [["a", "b"]],
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

    expect(target.test({ x: 112, y: 0, width: 10, height: 10 }), "between").toEqual({
      v: {
        d: 8,
        ad: 8,
        target: {
          direction: "v",
          pairs: [["a", "b"]],
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

    expect(target.test({ x: 127, y: 0, width: 10, height: 10 }), "between").toEqual({
      v: {
        d: -7,
        ad: 7,
        target: {
          direction: "v",
          pairs: [["a", "b"]],
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
    expect(target1.test({ x: 0, y: -68, width: 10, height: 10 }), "top side").toEqual({
      h: {
        d: 8,
        ad: 8,
        target: {
          direction: "h",
          pairs: [["a", "c"]],
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

    expect(target1.test({ x: 0, y: 308, width: 10, height: 10 }), "bottom side").toEqual({
      h: {
        d: -8,
        ad: 8,
        target: {
          direction: "h",
          pairs: [["a", "c"]],
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

    expect(target1.test({ x: 0, y: 112, width: 10, height: 10 }), "between").toEqual({
      h: {
        d: 8,
        ad: 8,
        target: {
          direction: "h",
          pairs: [["a", "c"]],
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

    expect(target1.test({ x: 0, y: 126, width: 10, height: 10 }), "between").toEqual({
      h: {
        d: -6,
        ad: 6,
        target: {
          direction: "h",
          pairs: [["a", "c"]],
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
          pairs: [["a", "d"]],
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
        linesByRotation: new Map([
          [
            Math.PI / 2,
            [
              [
                { x: 0, y: 100 },
                { x: 0, y: 0 },
              ],
              [
                { x: 100, y: 0 },
                { x: 100, y: 100 },
              ],
            ],
          ],
          [
            0,
            [
              [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
              ],
              [
                { x: 100, y: 100 },
                { x: 0, y: 100 },
              ],
            ],
          ],
        ]),
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
      anchorPoints: [{ x: 0, y: 10 }],
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
      anchorPoints: [{ x: 10, y: 0 }],
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
      anchorPoints: [{ x: 0, y: 0 }],
    });
  });

  test("should prioritize overlapped segments", () => {
    const shapeSnappingList2 = [
      ...shapeSnappingList,
      [
        "b",
        {
          linesByRotation: new Map([
            [
              Math.PI / 2,
              [
                [
                  { x: 100, y: 200 },
                  { x: 100, y: 100 },
                ],
                [
                  { x: 200, y: 100 },
                  { x: 200, y: 200 },
                ],
              ],
            ],
            [
              0,
              [
                [
                  { x: 100, y: 100 },
                  { x: 200, y: 100 },
                ],
                [
                  { x: 200, y: 200 },
                  { x: 100, y: 200 },
                ],
              ],
            ],
          ]),
        },
      ],
    ] as [string, ShapeSnappingLines][];
    const target = newShapeSnapping({ shapeSnappingList: shapeSnappingList2 });
    expect(target.testPoint({ x: 90, y: 101 })).toEqual({
      diff: { x: 0, y: -1 },
      targets: [
        {
          id: "b",
          line: [
            { x: 90, y: 100 },
            { x: 200, y: 100 },
          ],
          outOfRange: true,
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
      anchorPoints: [{ x: 90, y: 100 }],
    });
    expect(target.testPoint({ x: 110, y: 101 })).toEqual({
      diff: { x: 0, y: -1 },
      targets: [
        {
          id: "b",
          line: [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
          ],
        },
        {
          id: "a",
          line: [
            { x: 0, y: 100 },
            { x: 110, y: 100 },
          ],
          outOfRange: true,
        },
      ],
      intervalTargets: [],
      anchorPoints: [{ x: 110, y: 100 }],
    });
    expect(target.testPoint({ x: 101, y: 90 })).toEqual({
      diff: { x: -1, y: 0 },
      targets: [
        {
          id: "b",
          line: [
            { x: 100, y: 90 },
            { x: 100, y: 200 },
          ],
          outOfRange: true,
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
      anchorPoints: [{ x: 100, y: 90 }],
    });
    expect(target.testPoint({ x: 101, y: 110 })).toEqual({
      diff: { x: -1, y: 0 },
      targets: [
        {
          id: "b",
          line: [
            { x: 100, y: 100 },
            { x: 100, y: 200 },
          ],
        },
        {
          id: "a",
          line: [
            { x: 100, y: 0 },
            { x: 100, y: 110 },
          ],
          outOfRange: true,
        },
      ],
      intervalTargets: [],
      anchorPoints: [{ x: 100, y: 110 }],
    });
  });
});

describe("testPointOnLine", () => {
  const shapeSnappingList = [
    [
      "a",
      {
        linesByRotation: new Map([
          [
            Math.PI / 2,
            [
              [
                { x: 0, y: 100 },
                { x: 0, y: 0 },
              ],
              [
                { x: 100, y: 0 },
                { x: 100, y: 100 },
              ],
            ],
          ],
          [
            0,
            [
              [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
              ],
              [
                { x: 100, y: 100 },
                { x: 0, y: 100 },
              ],
            ],
          ],
        ]),
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
      anchorPoints: [{ x: 20, y: 0 }],
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
      anchorPoints: [{ x: 100, y: 0 }],
    });
  });

  test("should snap to an interval position on the line", () => {
    const shapeSnappingList2 = shapeSnappingList.concat([
      [
        "b",
        {
          linesByRotation: new Map([
            [
              Math.PI / 2,
              [
                [
                  { x: 120, y: 100 },
                  { x: 120, y: 0 },
                ],
                [
                  { x: 220, y: 0 },
                  { x: 220, y: 100 },
                ],
              ],
            ],
            [
              0,
              [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 0 },
                ],
                [
                  { x: 100, y: 100 },
                  { x: 0, y: 100 },
                ],
              ],
            ],
          ]),
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
          pairs: [["a", "b"]],
          direction: "v",
          lines: [
            [
              { x: 100, y: -20 },
              { x: 120, y: -20 },
            ],
            [
              { x: 220, y: -20 },
              { x: 240, y: -20 },
            ],
          ],
        },
      ],
      anchorPoints: [{ x: 240, y: -20 }],
    });
  });
});

describe("optimizeSnappingTargetInfoForPoint", () => {
  test("should optimize intervalTargets", () => {
    const result0 = optimizeSnappingTargetInfoForPoint(
      {
        targets: [],
        intervalTargets: [
          {
            pairs: [["a", "b"]],
            direction: "v",
            lines: [
              [
                { x: 100, y: -20 },
                { x: 120, y: -20 },
              ],
              [
                { x: 220, y: -20 },
                { x: 240, y: -20 },
              ],
            ],
          },
        ],
      },
      { x: 200, y: -22 },
    );
    expect(result0).toEqual({
      targets: [],
      intervalTargets: [
        {
          pairs: [["a", "b"]],
          direction: "v",
          lines: [
            [
              { x: 100, y: -22 },
              { x: 120, y: -22 },
            ],
            [
              { x: 220, y: -22 },
              { x: 240, y: -22 },
            ],
          ],
        },
      ],
    });

    const result1 = optimizeSnappingTargetInfoForPoint(
      {
        targets: [],
        intervalTargets: [
          {
            pairs: [["a", "b"]],
            direction: "h",
            lines: [
              [
                { y: 100, x: -20 },
                { y: 120, x: -20 },
              ],
              [
                { y: 220, x: -20 },
                { y: 240, x: -20 },
              ],
            ],
          },
        ],
      },
      { y: 200, x: -22 },
    );
    expect(result1).toEqual({
      targets: [],
      intervalTargets: [
        {
          pairs: [["a", "b"]],
          direction: "h",
          lines: [
            [
              { y: 100, x: -22 },
              { y: 120, x: -22 },
            ],
            [
              { y: 220, x: -22 },
              { y: 240, x: -22 },
            ],
          ],
        },
      ],
    });
  });
});

describe("getGuidelinesFromSnappingResult", () => {
  test("should filter guidelines running at the point", () => {
    expect(
      getGuidelinesFromSnappingResult(
        {
          targets: [
            {
              id: "",
              line: [
                { x: 0, y: 0 },
                { x: 0, y: 50 },
              ],
            },
            {
              id: "",
              line: [
                { x: 200, y: 0 },
                { x: 200, y: 50 },
              ],
            },
            {
              id: "",
              line: [
                { x: 0, y: 100 },
                { x: 100, y: 100 },
              ],
            },
          ],
          intervalTargets: [],
        },
        { x: 200, y: 100 },
      ),
    ).toEqual([
      [
        { x: 200, y: 0 },
        { x: 200, y: 50 },
      ],
      [
        { x: 0, y: 100 },
        { x: 100, y: 100 },
      ],
    ]);

    expect(
      getGuidelinesFromSnappingResult(
        {
          targets: [
            {
              id: "",
              line: [
                { x: 0, y: 100 },
                { x: 100, y: 100 },
              ],
            },
          ],
          intervalTargets: [
            {
              pairs: [["", ""]],
              lines: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 0 },
                ],
                [
                  { x: 200, y: 0 },
                  { x: 300, y: 0 },
                ],
              ],
              direction: "h",
            },
          ],
        },
        { x: 200, y: 100 },
      ),
    ).toEqual([
      [
        { x: 0, y: 100 },
        { x: 100, y: 100 },
      ],
      [
        { x: 200, y: 0 },
        { x: 200, y: 100 },
      ],
    ]);

    expect(
      getGuidelinesFromSnappingResult(
        {
          targets: [],
          intervalTargets: [
            {
              pairs: [["", ""]],
              lines: [
                [
                  { x: 0, y: 0 },
                  { x: 0, y: 100 },
                ],
                [
                  { x: 0, y: 200 },
                  { x: 0, y: 300 },
                ],
              ],
              direction: "h",
            },
          ],
        },
        { x: 100, y: 200 },
      ),
    ).toEqual([
      [
        { x: 0, y: 200 },
        { x: -100, y: 200 },
      ],
    ]);
  });
});

describe("newShapeSnapping > testWithSubRect", () => {
  // Shape "a" provides a vertical line at x=0 and a horizontal line at y=0.
  // Shape "b" provides a vertical line at x=100 and a horizontal line at y=100.
  const snapping = newShapeSnapping({
    shapeSnappingList: [
      [
        "a",
        {
          linesByRotation: new Map([
            [
              Math.PI / 2,
              [
                [
                  { x: 0, y: -500 },
                  { x: 0, y: 500 },
                ],
              ],
            ],
            [
              0,
              [
                [
                  { x: -500, y: 0 },
                  { x: 500, y: 0 },
                ],
              ],
            ],
          ]),
        },
      ],
      [
        "b",
        {
          linesByRotation: new Map([
            [
              Math.PI / 2,
              [
                [
                  { x: 100, y: -500 },
                  { x: 100, y: 500 },
                ],
              ],
            ],
            [
              0,
              [
                [
                  { x: -500, y: 100 },
                  { x: 500, y: 100 },
                ],
              ],
            ],
          ]),
        },
      ],
    ] as [string, ShapeSnappingLines][],
  });

  test("should return main result when sub is not provided", () => {
    const main = { rect: { x: -3, y: 40, width: 10, height: 10 } };
    expect(snapping.testWithSubRect(main)).toEqual(snapping.test(main));
  });

  test("should pick the result with the smaller diff magnitude", () => {
    // main snaps to x=0 with diff.x=3, sub snaps to x=100 with diff.x=1 — sub wins
    const main = { rect: { x: -3, y: 40, width: 10, height: 10 } };
    const sub = { rect: { x: 99, y: 40, width: 10, height: 10 } };
    const result = snapping.testWithSubRect(main, sub);
    expect(result?.diff.x).toBeCloseTo(1);
    expect(result?.targets.some((t) => t.id === "b")).toBe(true);
  });

  test("should pick main result when it has the smaller diff", () => {
    // main snaps to x=0 with diff.x=1, sub snaps to x=100 with diff.x=3 — main wins
    const main = { rect: { x: -1, y: 40, width: 10, height: 10 } };
    const sub = { rect: { x: 97, y: 40, width: 10, height: 10 } };
    const result = snapping.testWithSubRect(main, sub);
    expect(result?.diff.x).toBeCloseTo(1);
    expect(result?.targets.some((t) => t.id === "a")).toBe(true);
  });

  test("should return whichever result snaps when only one does", () => {
    // sub is far from any snap line, main snaps
    const main = { rect: { x: -3, y: 40, width: 10, height: 10 } };
    const sub = { rect: { x: 500, y: 500, width: 10, height: 10 } };
    const result = snapping.testWithSubRect(main, sub);
    expect(result?.targets.some((t) => t.id === "a")).toBe(true);
  });
});
