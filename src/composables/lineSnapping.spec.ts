import { expect, describe, test } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import {
  getOptimizedSegment,
  isLineSnappableShape,
  newLineSnapping,
  optimizeLinePath,
  patchLinesConnectedToShapeOutline,
} from "./lineSnapping";
import { LineShape } from "../shapes/line";
import { EllipseShape } from "../shapes/ellipse";
import { newShapeComposite } from "./shapeComposite";
import { TextShape } from "../shapes/text";
import { TwoSidedArrowShape } from "../shapes/twoSidedArrow";
import { newShapeSnapping } from "./shapeSnapping";

describe("newLineSnapping", () => {
  describe("testConnection", () => {
    const snappableShapes = [
      createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 100, height: 100 }),
      createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "b",
        p: { x: 150, y: 0 },
        width: 100,
        height: 100,
      }),
      createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 100, height: 100 }),
    ];

    test("should return connection result: End vertex", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 100 } });
      const target = newLineSnapping({ snappableShapes, getShapeStruct: getCommonStruct, movingLine, movingIndex: 1 });
      expect(target.testConnection({ x: -20, y: 10 }, 1)).toEqual(undefined);

      // Self snapped: Horizontally
      expect(target.testConnection({ x: -20, y: 2 }, 1)).toEqual({
        p: { x: -20, y: 0 },
        guidLines: [
          [
            { x: 0, y: 0 },
            { x: -20, y: 0 },
          ],
        ],
      });

      // Self snapped: Vertically
      expect(target.testConnection({ x: 2, y: -20 }, 1)).toEqual({
        p: { x: 0, y: -20 },
        guidLines: [
          [
            { x: 0, y: 0 },
            { x: 0, y: -20 },
          ],
        ],
      });

      // Self snapped: On a line formed by each adjacent vertex and the original point
      expect(target.testConnection({ x: -20, y: -21 }, 1)).toEqual({
        p: { x: -20.5, y: -20.5 },
        guidLines: [
          [
            { x: 100, y: 100 },
            { x: -20.5, y: -20.5 },
          ],
        ],
      });

      // Outline snapped
      expect(target.testConnection({ x: 50, y: 105 }, 1)).toEqual({
        connection: { id: "a", rate: { x: 0.5, y: 1 } },
        outlineSrc: "a",
        p: { x: 50, y: 100 },
      });

      // Outline snapped
      expect(target.testConnection({ x: 160, y: 95 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0.1, y: 1 } },
        outlineSrc: "b",
        p: { x: 160, y: 100 },
      });

      // Snapped to the center of a shape
      expect(target.testConnection({ x: 49, y: 51 }, 1)).toEqual({
        connection: { id: "a", rate: { x: 0.5, y: 0.5 } },
        outlineSrc: "a",
        p: { x: 50, y: 50 },
      });

      // Self snapped & Outline snapped
      expect(target.testConnection({ x: 155, y: -5 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0, y: 0 } },
        outlineSrc: "b",
        p: { x: 150, y: 0 },
        guidLines: [
          [
            { x: 0, y: 0 },
            { x: 155, y: 0 },
          ],
        ],
      });
    });

    test("should return connection result: Inner vertex", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        body: [{ p: { x: 100, y: 0 } }],
        q: { x: 200, y: 100 },
      });
      const target = newLineSnapping({ snappableShapes, getShapeStruct: getCommonStruct, movingLine, movingIndex: 1 });
      // Snapped to the center of a shape
      expect(target.testConnection({ x: 49, y: 51 }, 1)).toEqual({
        connection: { id: "a", rate: { x: 0.5, y: 0.5 } },
        outlineSrc: "a",
        p: { x: 50, y: 50 },
      });
    });

    test("should return connection result: body vertex", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "a",
        q: { x: 100, y: 100 },
        body: [{ p: { x: 50, y: -50 } }],
      });
      const target = newLineSnapping({
        snappableShapes: [],
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });

      expect(target.testConnection({ x: 60, y: 50 }, 1)).toEqual(undefined);

      // Self snapped to both adjacent vertices
      expect(target.testConnection({ x: 95, y: -5 }, 1)).toEqual({
        p: { x: 100, y: 0 },
        guidLines: [
          [
            { x: 100, y: 100 },
            { x: 100, y: 0 },
          ],
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        ],
      });
    });

    test("should snap to shape outline along other shape", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "a", q: { x: 100, y: 50 } });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: [
          [
            "z",
            {
              h: [
                [
                  { x: -500, y: 30 },
                  { x: 500, y: 30 },
                ],
              ],
              v: [
                [
                  { x: 230, y: -500 },
                  { x: 230, y: 500 },
                ],
              ],
            },
          ],
        ],
      });
      const target = newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });

      expect(target.testConnection({ x: 231, y: 101 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0.8, y: 1 } },
        outlineSrc: "b",
        p: { x: 230, y: 100 },
        guidLines: [],
        shapeSnappingResult: {
          diff: {
            x: -1,
            y: 0,
          },
          intervalTargets: [],
          targets: [
            {
              id: "z",
              line: [
                {
                  x: 230,
                  y: -500,
                },
                {
                  x: 230,
                  y: 500,
                },
              ],
            },
          ],
        },
      });
      expect(target.testConnection({ x: 149, y: 29 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0, y: 0.3 } },
        outlineSrc: "b",
        p: { x: 150, y: 30 },
        guidLines: [],
        shapeSnappingResult: {
          diff: {
            x: 0,
            y: 1,
          },
          intervalTargets: [],
          targets: [
            {
              id: "z",
              line: [
                {
                  x: -500,
                  y: 30,
                },
                {
                  x: 500,
                  y: 30,
                },
              ],
            },
          ],
        },
      });
    });

    test("should snap to shape outline along a grid", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "a", q: { x: 100, y: 50 } });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: [],
        gridSnapping: {
          h: [
            [
              { x: -500, y: 30 },
              { x: 500, y: 30 },
            ],
          ],
          v: [
            [
              { x: 230, y: -500 },
              { x: 230, y: 500 },
            ],
          ],
        },
      });
      const target = newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });

      expect(target.testConnection({ x: 231, y: 101 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0.8, y: 1 } },
        outlineSrc: "b",
        p: { x: 230, y: 100 },
        guidLines: [],
        shapeSnappingResult: {
          diff: {
            x: -1,
            y: 0,
          },
          intervalTargets: [],
          targets: [
            {
              id: "GRID",
              line: [
                {
                  x: 230,
                  y: -500,
                },
                {
                  x: 230,
                  y: 500,
                },
              ],
            },
          ],
        },
      });
      expect(target.testConnection({ x: 149, y: 29 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0, y: 0.3 } },
        outlineSrc: "b",
        p: { x: 150, y: 30 },
        guidLines: [],
        shapeSnappingResult: {
          diff: {
            x: 0,
            y: 1,
          },
          intervalTargets: [],
          targets: [
            {
              id: "GRID",
              line: [
                {
                  x: -500,
                  y: 30,
                },
                {
                  x: 500,
                  y: 30,
                },
              ],
            },
          ],
        },
      });
    });

    test("should snap to gridlines when there's no other candidate", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "a", q: { x: 100, y: 50 } });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: [],
        gridSnapping: {
          h: [
            [
              { x: -100, y: 50 },
              { x: 100, y: 50 },
            ],
          ],
          v: [
            [
              { x: 30, y: -100 },
              { x: 30, y: 100 },
            ],
          ],
        },
      });
      const target = newLineSnapping({
        snappableShapes: [],
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });

      expect(target.testConnection({ x: 31, y: 49 }, 1)).toEqual({
        p: { x: 30, y: 50 },
        shapeSnappingResult: {
          diff: {
            x: -1,
            y: 1,
          },
          intervalTargets: [],
          targets: [
            {
              id: "GRID",
              line: [
                {
                  x: 30,
                  y: -100,
                },
                {
                  x: 30,
                  y: 100,
                },
              ],
            },
            {
              id: "GRID",
              line: [
                {
                  x: -100,
                  y: 50,
                },
                {
                  x: 100,
                  y: 50,
                },
              ],
            },
          ],
        },
      });
    });
  });
});

describe("getOptimizedSegment", () => {
  describe("when two shapes overlap horizontally", () => {
    test("should return optimized segment between two shapes", () => {
      const shapeA = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 100, height: 100 });
      const shapeB = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "b",
        p: { x: 200, y: 50 },
        width: 100,
        height: 100,
      });
      const res = getOptimizedSegment(
        newShapeComposite({ shapes: [shapeA, shapeB], getStruct: getCommonStruct }),
        shapeA,
        shapeB,
      );
      expect(res).toEqual([
        { x: 100, y: 75 },
        { x: 200, y: 75 },
      ]);
    });
  });

  describe("when two shapes overlap vertically", () => {
    test("should return optimized segment between two shapes", () => {
      const shapeA = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 100, height: 100 });
      const shapeB = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "b",
        p: { x: 50, y: 200 },
        width: 100,
        height: 100,
      });
      const res = getOptimizedSegment(
        newShapeComposite({ shapes: [shapeA, shapeB], getStruct: getCommonStruct }),
        shapeA,
        shapeB,
      );
      expect(res).toEqual([
        { x: 75, y: 100 },
        { x: 75, y: 200 },
      ]);
    });
  });

  describe("when two shapes overlap neither horizontally nor vertically", () => {
    test("should return optimized segment between two shapes", () => {
      const shapeA = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 100, height: 100 });

      const shapeBottomRight = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "b",
        p: { x: 150, y: 200 },
        width: 100,
        height: 100,
      });
      const res0 = getOptimizedSegment(
        newShapeComposite({ shapes: [shapeA, shapeBottomRight], getStruct: getCommonStruct }),
        shapeA,
        shapeBottomRight,
      );
      expect(res0).toEqual([
        { x: 100, y: 100 },
        { x: 150, y: 200 },
      ]);

      const shapeBottomLeft = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "b",
        p: { x: -150, y: 200 },
        width: 100,
        height: 100,
      });
      const res1 = getOptimizedSegment(
        newShapeComposite({ shapes: [shapeA, shapeBottomLeft], getStruct: getCommonStruct }),
        shapeA,
        shapeBottomLeft,
      );
      expect(res1).toEqual([
        { x: 0, y: 100 },
        { x: -50, y: 200 },
      ]);

      const shapeTopLeft = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "b",
        p: { x: -150, y: -200 },
        width: 100,
        height: 100,
      });
      const res2 = getOptimizedSegment(
        newShapeComposite({ shapes: [shapeA, shapeTopLeft], getStruct: getCommonStruct }),
        shapeA,
        shapeTopLeft,
      );
      expect(res2).toEqual([
        { x: 0, y: 0 },
        { x: -50, y: -100 },
      ]);

      const shapeTopRight = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "b",
        p: { x: 150, y: -200 },
        width: 100,
        height: 100,
      });
      const res3 = getOptimizedSegment(
        newShapeComposite({ shapes: [shapeA, shapeTopRight], getStruct: getCommonStruct }),
        shapeA,
        shapeTopRight,
      );
      expect(res3).toEqual([
        { x: 100, y: 0 },
        { x: 150, y: -100 },
      ]);
    });

    test("rotated case", () => {
      const shapeA = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 100, height: 100 });

      const shapeBottomRight = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "b",
        p: { x: 150, y: -200 },
        width: 100,
        height: 100,
        rotation: Math.PI / 4,
      });
      const res0 = getOptimizedSegment(
        newShapeComposite({ shapes: [shapeA, shapeBottomRight], getStruct: getCommonStruct }),
        shapeA,
        shapeBottomRight,
      );
      expect(res0?.[0]).toEqual({ x: 100, y: 0 });
      expect(res0?.[1].x).toBeGreaterThan(50);
      expect(res0?.[1].x).toBeLessThan(150);
      expect(res0?.[1].y).toBeGreaterThan(-150);
      expect(res0?.[1].y).toBeLessThan(-100);
    });
  });

  test("should optimize based on the center when a shape doesn't require rectangular optimization", () => {
    const shapeA = createShape<EllipseShape>(getCommonStruct, "ellipse", { id: "a", rx: 50, ry: 50 });
    const shapeB = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "b",
      p: { x: 200, y: 50 },
      width: 100,
      height: 100,
    });
    const shapeC = createShape<EllipseShape>(getCommonStruct, "ellipse", {
      id: "c",
      p: { x: 0, y: 200 },
      rx: 50,
      ry: 50,
    });

    const res0 = getOptimizedSegment(
      newShapeComposite({ shapes: [shapeA, shapeB], getStruct: getCommonStruct }),
      shapeA,
      shapeB,
    );
    expect(res0).toEqual([
      { x: 100, y: 50 },
      { x: 200, y: 50 },
    ]);

    const res1 = getOptimizedSegment(
      newShapeComposite({ shapes: [shapeB, shapeA], getStruct: getCommonStruct }),
      shapeB,
      shapeA,
    );
    expect(res1).toEqual([
      { x: 200, y: 50 },
      { x: 100, y: 50 },
    ]);

    const res2 = getOptimizedSegment(
      newShapeComposite({ shapes: [shapeA, shapeC], getStruct: getCommonStruct }),
      shapeA,
      shapeC,
    );
    expect(res2).toEqual([
      { x: 50, y: 100 },
      { x: 50, y: 200 },
    ]);
  });
});

describe("optimizeLinePath", () => {
  const a = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 100, height: 100 });
  const b = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "b",
    p: { x: 200, y: 200 },
    width: 100,
    height: 100,
  });

  describe("When the line has both p and q optimized connections", () => {
    test("should optimize both p and q connections", () => {
      const line = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 0, y: 0 },
        q: { x: 300, y: 300 },
        pConnection: { id: "a", rate: { x: 1, y: 0 }, optimized: true },
        qConnection: { id: "b", rate: { x: 1, y: 1 }, optimized: true },
      });
      const res = optimizeLinePath(
        {
          getShapeComposite: () => newShapeComposite({ shapes: [a, b, line], getStruct: getCommonStruct }),
        },
        line,
      );
      expect(res).toEqual({
        p: { x: 100, y: 100 },
        q: { x: 200, y: 200 },
        pConnection: { id: "a", rate: { x: 1, y: 1 }, optimized: true },
        qConnection: { id: "b", rate: { x: 0, y: 0 }, optimized: true },
      });
    });
  });

  describe("When the line has p optimized connection but don't q's", () => {
    test("should optimize p connection", () => {
      const line = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 0, y: 0 },
        q: { x: 300, y: 300 },
        pConnection: { id: "a", rate: { x: 1, y: 0 }, optimized: true },
        qConnection: { id: "b", rate: { x: 1, y: 1 } },
      });
      const res = optimizeLinePath(
        {
          getShapeComposite: () => newShapeComposite({ shapes: [a, b, line], getStruct: getCommonStruct }),
        },
        line,
      );
      expect(res).toEqual({
        p: { x: 100, y: 100 },
        pConnection: { id: "a", rate: { x: 1, y: 1 }, optimized: true },
      });
    });
  });

  describe("When the line has q optimized connection but don't p's", () => {
    test("should optimize q connection", () => {
      const line = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 0, y: 0 },
        q: { x: 300, y: 300 },
        pConnection: { id: "a", rate: { x: 1, y: 0 } },
        qConnection: { id: "b", rate: { x: 1, y: 1 }, optimized: true },
      });
      const res = optimizeLinePath(
        {
          getShapeComposite: () => newShapeComposite({ shapes: [a, b, line], getStruct: getCommonStruct }),
        },
        line,
      );
      expect(res).toEqual({
        q: { x: 200, y: 200 },
        qConnection: { id: "b", rate: { x: 0, y: 0 }, optimized: true },
      });
    });
  });

  describe("When the line has neither p nor q optimized connections", () => {
    test("should return undefined", () => {
      const line = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 0, y: 0 },
        q: { x: 300, y: 300 },
        pConnection: { id: "a", rate: { x: 1, y: 0 } },
        qConnection: { id: "b", rate: { x: 1, y: 1 } },
      });
      const res = optimizeLinePath(
        {
          getShapeComposite: () => newShapeComposite({ shapes: [a, b, line], getStruct: getCommonStruct }),
        },
        line,
      );
      expect(res).toEqual(undefined);
    });
  });

  describe("ellipse case", () => {
    const a = createShape<EllipseShape>(getCommonStruct, "ellipse", { id: "a", rx: 50, ry: 50 });
    const b = createShape<EllipseShape>(getCommonStruct, "ellipse", {
      id: "b",
      p: { x: 0, y: 200 },
      rx: 50,
      ry: 50,
    });

    test("the line is straight and has both p and q connections", () => {
      const line = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 0, y: 0 },
        q: { x: 0, y: 300 },
        pConnection: { id: "a", rate: { x: 0, y: 0 }, optimized: true },
        qConnection: { id: "b", rate: { x: 0, y: 1 }, optimized: true },
      });
      const res = optimizeLinePath(
        {
          getShapeComposite: () => newShapeComposite({ shapes: [a, b, line], getStruct: getCommonStruct }),
        },
        line,
      );
      expect(res).toEqual({
        p: { x: 50, y: 100 },
        q: { x: 50, y: 200 },
        pConnection: { id: "a", rate: { x: 0.5, y: 1 }, optimized: true },
        qConnection: { id: "b", rate: { x: 0.5, y: 0 }, optimized: true },
      });
    });

    test("when the line is elbow, ignore body vertices for optimization", () => {
      const line = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 0, y: 0 },
        q: { x: 0, y: 300 },
        pConnection: { id: "a", rate: { x: 0, y: 0 }, optimized: true },
        qConnection: { id: "b", rate: { x: 0, y: 1 }, optimized: true },
        body: [{ p: { x: 0, y: 0 } }, { p: { x: 0, y: 0 } }, { p: { x: 0, y: 0 } }, { p: { x: 0, y: 0 } }],
        lineType: "elbow",
      });
      const res = optimizeLinePath(
        {
          getShapeComposite: () => newShapeComposite({ shapes: [a, b, line], getStruct: getCommonStruct }),
        },
        line,
      );
      expect(res).toEqual({
        p: { x: 50, y: 100 },
        q: { x: 50, y: 200 },
        pConnection: { id: "a", rate: { x: 0.5, y: 1 }, optimized: true },
        qConnection: { id: "b", rate: { x: 0.5, y: 0 }, optimized: true },
      });
    });
  });

  test("should disconnect when connected a shape isn't found", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      id: "line",
      p: { x: 0, y: 0 },
      q: { x: 300, y: 300 },
      pConnection: { id: "a", rate: { x: 1, y: 0 }, optimized: true },
      qConnection: { id: "b", rate: { x: 1, y: 1 }, optimized: true },
    });
    const res0 = optimizeLinePath(
      {
        getShapeComposite: () => newShapeComposite({ shapes: [a, line], getStruct: getCommonStruct }),
      },
      line,
    );
    expect(res0).toEqual({
      p: { x: 100, y: 100 },
      pConnection: { id: "a", rate: { x: 1, y: 1 }, optimized: true },
    });
    expect(res0).toHaveProperty("qConnection");

    const res1 = optimizeLinePath(
      {
        getShapeComposite: () => newShapeComposite({ shapes: [b, line], getStruct: getCommonStruct }),
      },
      line,
    );
    expect(res1).toEqual({
      q: { x: 200, y: 200 },
      qConnection: { id: "b", rate: { x: 0, y: 0 }, optimized: true },
    });
    expect(res1).toHaveProperty("pConnection");

    const res2 = optimizeLinePath(
      {
        getShapeComposite: () => newShapeComposite({ shapes: [line], getStruct: getCommonStruct }),
      },
      line,
    );
    expect(res2).toEqual({});
    expect(res2).toHaveProperty("pConnection");
    expect(res2).toHaveProperty("qConnection");
  });
});

describe("isLineSnappableShape", () => {
  test("should return true if a shape is snappable to lines", () => {
    const rect = createShape(getCommonStruct, "rectangle", { id: "rect" });
    const text = createShape(getCommonStruct, "text", { id: "text" });
    const line = createShape(getCommonStruct, "line", { id: "line" });
    const label = createShape<TextShape>(getCommonStruct, "text", {
      id: "label",
      lineAttached: 0.5,
      parentId: line.id,
    });
    const group = createShape(getCommonStruct, "group", { id: "group" });
    const shapeComposite = newShapeComposite({ shapes: [rect, text, line, label, group], getStruct: getCommonStruct });

    expect(isLineSnappableShape(shapeComposite, rect)).toBe(true);
    expect(isLineSnappableShape(shapeComposite, text)).toBe(true);
    expect(isLineSnappableShape(shapeComposite, line)).toBe(true);

    expect(isLineSnappableShape(shapeComposite, label)).toBe(false);
    expect(isLineSnappableShape(shapeComposite, group)).toBe(false);
  });
});

describe("patchLinesConnectedToShapeOutline", () => {
  const line = createShape<LineShape>(getCommonStruct, "line", {
    id: "line",
    p: { x: 0, y: 50 },
    body: [{ p: { x: -200, y: 50 } }, { p: { x: -200, y: 200 } }, { p: { x: 50, y: 200 } }],
    q: { x: 50, y: 100 },
    pConnection: { id: "a", rate: { x: 0, y: 0.5 } },
    qConnection: { id: "a", rate: { x: 0.5, y: 1 } },
  });
  const shapeA = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "a",
    p: { x: -50, y: -50 },
    width: 200,
    height: 200,
  });

  test("should reconnect lines to the outline of the shape: rectangle -> rectangle", () => {
    const shapeComposite = newShapeComposite({ shapes: [line, shapeA], getStruct: getCommonStruct });
    const res = patchLinesConnectedToShapeOutline(shapeComposite, shapeA);
    expect(res).toEqual({
      line: {
        p: { x: -50, y: 50 },
        q: { x: 50, y: 150 },
        pConnection: { id: "a", rate: { x: 0, y: 0.5 } },
        qConnection: { id: "a", rate: { x: 0.5, y: 1 } },
      },
    });
  });

  test("should reconnect lines to the outline of the shape: rectangle -> star", () => {
    const arrow = createShape<TwoSidedArrowShape>(getCommonStruct, "two_sided_arrow", {
      id: "a",
      width: 100,
      height: 50,
    });
    const shapeComposite = newShapeComposite({ shapes: [line, arrow], getStruct: getCommonStruct });
    const res = patchLinesConnectedToShapeOutline(shapeComposite, arrow);
    expect(res).toEqual({
      line: {
        p: { x: 25, y: 50 },
        q: { x: 50, y: 37.5 },
        pConnection: { id: "a", rate: { x: 0.25, y: 1 } },
        qConnection: { id: "a", rate: { x: 0.5, y: 0.75 } },
      },
    });
  });

  test("should reconnect to the closest candidate", () => {
    const shapeComposite = newShapeComposite({
      shapes: [{ ...line, p: { x: 80, y: 50 }, q: { x: 50, y: 20 } } as LineShape, shapeA],
      getStruct: getCommonStruct,
    });
    const res = patchLinesConnectedToShapeOutline(shapeComposite, shapeA);
    expect(res).toEqual({
      line: {
        p: { x: 150, y: 50 },
        q: { x: 50, y: -50 },
        pConnection: { id: "a", rate: { x: 1, y: 0.5 } },
        qConnection: { id: "a", rate: { x: 0.5, y: 0 } },
      },
    });
  });

  test("should ignore connections at the center", () => {
    const optimized = createShape<LineShape>(getCommonStruct, "line", {
      ...line,
      pConnection: { id: "a", rate: { x: 0.5, y: 0.5 } },
      qConnection: { id: "a", rate: { x: 0.5, y: 0.5 } },
    });
    const shapeComposite = newShapeComposite({ shapes: [optimized, shapeA], getStruct: getCommonStruct });
    const res = patchLinesConnectedToShapeOutline(shapeComposite, shapeA);
    expect(res).toEqual({});
  });

  test("should ignore optimized connections", () => {
    const optimized = createShape<LineShape>(getCommonStruct, "line", {
      ...line,
      pConnection: { id: "a", rate: { x: 0, y: 0.5 }, optimized: true },
      qConnection: { id: "a", rate: { x: 0.5, y: 1 }, optimized: true },
    });
    const shapeComposite = newShapeComposite({ shapes: [optimized, shapeA], getStruct: getCommonStruct });
    const res = patchLinesConnectedToShapeOutline(shapeComposite, shapeA);
    expect(res).toEqual({});
  });

  test("should ignore connections unrelated to the shape", () => {
    const shapeComposite = newShapeComposite({ shapes: [line, shapeA], getStruct: getCommonStruct });
    const res = patchLinesConnectedToShapeOutline(shapeComposite, { ...shapeA, id: "b" });
    expect(res).toEqual({});
  });
});
