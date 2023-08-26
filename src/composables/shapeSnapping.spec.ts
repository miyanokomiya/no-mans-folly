import { describe, expect, test } from "vitest";
import { newShapeSnapping } from "./shapeSnapping";
import { ShapeSnappingLines } from "../shapes/core";

describe("newShapeSnapping", () => {
  const shapeSnappingList = [
    [
      "a",
      {
        v: [
          [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
          [
            { x: 0, y: 100 },
            { x: 0, y: 0 },
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

  test("x snapping: should return expanded rectangle", () => {
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
    });

    expect(target.test({ x: 95, y: 40, width: 20, height: 20 })).toEqual({
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
    });
  });

  test("y snapping: should return expanded rectangle", () => {
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
    });

    expect(target.test({ x: 40, y: 95, width: 20, height: 20 })).toEqual({
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
    });
  });

  test("x y snapping: should return expanded rectangle", () => {
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
    });

    expect(target.test({ x: -5, y: -5, width: 20, height: 20 })).toEqual({
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
    });
  });
});
