import { describe, expect, test } from "vitest";
import { getGridSize, newGrid, pickClosestGridLineAtPoint, snapVectorToGrid } from "./grid";
import { ShapeSnappingLines } from "../shapes/core";
import { ISegment } from "../utils/geometry";

describe("newGrid", () => {
  test("should create grid segments", () => {
    const grid = newGrid({ size: 10, range: { x: 5, y: 15, width: 50, height: 65 } });
    expect(grid.getSnappingLines().linesByRotation.get(Math.PI / 2)).toEqual([
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

    expect(grid.getSnappingLines().linesByRotation.get(0)).toEqual([
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

  describe("pickClosestGridLineVAtPoint", () => {
    test("should return the clsoest horizontal grid line", () => {
      const grid = newGrid({ size: 10, range: { x: 5, y: 15, width: 50, height: 65 } });
      expect(grid.pickClosestGridLineVAtPoint({ x: 1, y: 0 })).toEqualPoints([
        { x: 0, y: 15 },
        { x: 0, y: 80 },
      ]);
      expect(grid.pickClosestGridLineVAtPoint({ x: 58, y: 1 })).toEqualPoints([
        { x: 60, y: 15 },
        { x: 60, y: 80 },
      ]);
    });
  });

  describe("pickClosestGridLineHAtPoint", () => {
    test("should return the clsoest horizontal grid line", () => {
      const grid = newGrid({ size: 10, range: { x: 5, y: 15, width: 50, height: 65 } });
      expect(grid.pickClosestGridLineHAtPoint({ x: 0, y: 1 })).toEqualPoints([
        { x: 5, y: 0 },
        { x: 55, y: 0 },
      ]);
      expect(grid.pickClosestGridLineHAtPoint({ x: 0, y: 58 })).toEqualPoints([
        { x: 5, y: 60 },
        { x: 55, y: 60 },
      ]);
    });
  });
});

describe("getGridSize", () => {
  test("should return grid size for the given scale", () => {
    expect(getGridSize(20, 1)).toBeCloseTo(20);
    expect(getGridSize(15, 1)).toBeCloseTo(15);
    expect(getGridSize(10, 1)).toBeCloseTo(20);
    expect(getGridSize(20, 2)).toBeCloseTo(40);
    expect(getGridSize(15, 2)).toBeCloseTo(45);
    expect(getGridSize(10, 2)).toBeCloseTo(40);
  });
});

describe("snapVectorToGrid", () => {
  const hLines: ISegment[] = [
    [
      { x: -200, y: 0 },
      { x: 200, y: 0 },
    ],
    [
      { x: -200, y: 50 },
      { x: 200, y: 50 },
    ],
  ];
  const vLines: ISegment[] = [
    [
      { x: 0, y: -200 },
      { x: 0, y: 200 },
    ],
    [
      { x: 50, y: -200 },
      { x: 50, y: 200 },
    ],
  ];
  const gridSnapping: ShapeSnappingLines = {
    linesByRotation: new Map([
      [0, hLines],
      [Math.PI / 2, vLines],
    ]),
  };

  test("should snap to unparallel grid line near by", () => {
    expect(snapVectorToGrid(gridSnapping, { x: -20, y: 0 }, { x: 1, y: 0 }, 5)).toEqual({
      p: { x: 0, y: 0 },
      lines: [vLines[0]],
    });

    expect(snapVectorToGrid(gridSnapping, { x: 0, y: -20 }, { x: 0, y: 51 }, 5)).toEqual({
      p: { x: 0, y: 50 },
      lines: [hLines[1]],
    });
  });
});

describe("pickClosestGridLineAtPoint", () => {
  const hLines: ISegment[] = [
    [
      { x: -200, y: 0 },
      { x: 200, y: 0 },
    ],
    [
      { x: -200, y: 50 },
      { x: 200, y: 50 },
    ],
  ];
  const vLines: ISegment[] = [
    [
      { x: 0, y: -200 },
      { x: 0, y: 200 },
    ],
    [
      { x: 50, y: -200 },
      { x: 50, y: 200 },
    ],
  ];
  const gridSnapping: ShapeSnappingLines = {
    linesByRotation: new Map([
      [0, hLines],
      [Math.PI / 2, vLines],
    ]),
  };

  test("should return the closest grid line", () => {
    expect(pickClosestGridLineAtPoint(gridSnapping, { x: 500, y: 500 }, 5)).toEqual(undefined);

    expect(pickClosestGridLineAtPoint(gridSnapping, { x: 2, y: 1 }, 5)).toEqual({
      p: { x: 2, y: 0 },
      line: hLines[0],
      rotation: 0,
    });
    expect(pickClosestGridLineAtPoint(gridSnapping, { x: 100, y: 1 }, 5)).toEqual({
      p: { x: 100, y: 0 },
      line: hLines[0],
      rotation: 0,
    });

    expect(pickClosestGridLineAtPoint(gridSnapping, { x: 1, y: 2 }, 5)).toEqual({
      p: { x: 0, y: 2 },
      line: vLines[0],
      rotation: Math.PI / 2,
    });
    expect(pickClosestGridLineAtPoint(gridSnapping, { x: 1, y: 100 }, 5)).toEqual({
      p: { x: 0, y: 100 },
      line: vLines[0],
      rotation: Math.PI / 2,
    });
  });
});
