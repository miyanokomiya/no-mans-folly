import { describe, expect, test } from "vitest";
import { newGrid, snapVectorToGrid } from "./grid";
import { ShapeSnappingLines } from "../shapes/core";

describe("newGrid", () => {
  test("should create grid segments", () => {
    const grid = newGrid({ size: 10, range: { x: 5, y: 15, width: 50, height: 65 } });
    expect(grid.getSegmentsV()).toEqual([
      [
        { x: 10, y: 15 },
        { x: 10, y: 80 },
      ],
      [
        { x: 20, y: 15 },
        { x: 20, y: 80 },
      ],
      [
        { x: 30, y: 15 },
        { x: 30, y: 80 },
      ],
      [
        { x: 40, y: 15 },
        { x: 40, y: 80 },
      ],
      [
        { x: 50, y: 15 },
        { x: 50, y: 80 },
      ],
    ]);

    expect(grid.getSegmentsH()).toEqual([
      [
        { x: 5, y: 20 },
        { x: 55, y: 20 },
      ],
      [
        { x: 5, y: 30 },
        { x: 55, y: 30 },
      ],
      [
        { x: 5, y: 40 },
        { x: 55, y: 40 },
      ],
      [
        { x: 5, y: 50 },
        { x: 55, y: 50 },
      ],
      [
        { x: 5, y: 60 },
        { x: 55, y: 60 },
      ],
      [
        { x: 5, y: 70 },
        { x: 55, y: 70 },
      ],
      [
        { x: 5, y: 80 },
        { x: 55, y: 80 },
      ],
    ]);
  });
});

describe("snapVectorToGrid", () => {
  const gridSnapping: ShapeSnappingLines = {
    h: [
      [
        { x: -200, y: 0 },
        { x: 200, y: 0 },
      ],
      [
        { x: -200, y: 50 },
        { x: 200, y: 50 },
      ],
    ],
    v: [
      [
        { x: 0, y: -200 },
        { x: 0, y: 200 },
      ],
      [
        { x: 50, y: -200 },
        { x: 50, y: 200 },
      ],
    ],
  };

  test("should snap to unparallel grid line near by", () => {
    expect(snapVectorToGrid(gridSnapping, { x: -20, y: 0 }, { x: 1, y: 0 }, 5)).toEqual({
      p: { x: 0, y: 0 },
      lines: [gridSnapping.v[0]],
    });

    expect(snapVectorToGrid(gridSnapping, { x: 0, y: -20 }, { x: 0, y: 51 }, 5)).toEqual({
      p: { x: 0, y: 50 },
      lines: [gridSnapping.h[1]],
    });
  });
});
