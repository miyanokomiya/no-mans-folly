import { describe, expect, test } from "vitest";
import { newShapeIntervalSnapping, newShapeSnapping } from "./shapeSnapping";
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
});
