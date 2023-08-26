import { describe, expect, test } from "vitest";
import { newShapeSnapping } from "./shapeSnapping";
import { IVec2 } from "okageo";

describe("newShapeSnapping", () => {
  const shapeSnappingList = [
    [
      "a",
      [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        [
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
        [
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
        [
          { x: 0, y: 100 },
          { x: 0, y: 0 },
        ],
      ],
    ] as [string, [IVec2, IVec2][]],
  ];
  const target = newShapeSnapping({ shapeSnappingList });

  test("x snapping: should return expanded rectangle", () => {
    expect(target.test({ x: -15, y: 40, width: 10, height: 10 })).toEqual({
      dx: 5,
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 100 },
            { x: 0, y: 0 },
          ],
        },
      ],
    });

    expect(target.test({ x: 5, y: 40, width: 10, height: 10 })).toEqual({
      dx: -5,
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 100 },
            { x: 0, y: 0 },
          ],
        },
      ],
    });

    expect(target.test({ x: 95, y: 40, width: 10, height: 10 })).toEqual({
      dx: 5,
      targets: [
        {
          id: "a",
          line: [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        },
      ],
    });

    expect(target.test({ x: 105, y: 40, width: 10, height: 10 })).toEqual({
      dx: -5,
      targets: [
        {
          id: "a",
          line: [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        },
      ],
    });
  });

  test("y snapping: should return expanded rectangle", () => {
    expect(target.test({ x: 40, y: -15, width: 10, height: 10 })).toEqual({
      dy: 5,
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
    });

    expect(target.test({ x: 40, y: 5, width: 10, height: 10 })).toEqual({
      dy: -5,
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        },
      ],
    });

    expect(target.test({ x: 40, y: 95, width: 10, height: 10 })).toEqual({
      dy: 5,
      targets: [
        {
          id: "a",
          line: [
            { x: 100, y: 100 },
            { x: 0, y: 100 },
          ],
        },
      ],
    });

    expect(target.test({ x: 40, y: 105, width: 10, height: 10 })).toEqual({
      dy: -5,
      targets: [
        {
          id: "a",
          line: [
            { x: 100, y: 100 },
            { x: 0, y: 100 },
          ],
        },
      ],
    });
  });

  test("x y snapping: should return expanded rectangle", () => {
    expect(target.test({ x: -15, y: -15, width: 10, height: 10 })).toEqual({
      dx: 5,
      dy: 5,
      targets: [
        {
          id: "a",
          line: [
            { x: 0, y: 100 },
            { x: 0, y: 0 },
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
    });
  });
});
