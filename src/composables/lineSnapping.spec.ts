import { expect, describe, test } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { getOptimizedSegment, isLineSnappableShape, newLineSnapping, optimizeLinePath } from "./lineSnapping";
import { LineShape } from "../shapes/line";
import { EllipseShape } from "../shapes/ellipse";
import { newShapeComposite } from "./shapeComposite";
import { TextShape } from "../shapes/text";

describe("newLineSnapping", () => {
  describe("testConnection", () => {
    test("should return connection result", () => {
      const snappableShapes = [
        createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 100, height: 100 }),
        createShape<RectangleShape>(getCommonStruct, "rectangle", {
          id: "b",
          p: { x: 150, y: 0 },
          width: 100,
          height: 100,
        }),
      ];
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "a", q: { x: 100, y: 100 } });
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
        p: { x: 50, y: 100 },
      });

      // Outline snapped
      expect(target.testConnection({ x: 160, y: 95 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0.1, y: 1 } },
        p: { x: 160, y: 100 },
      });

      // Self snapped & Outline snapped
      expect(target.testConnection({ x: 160, y: -5 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0, y: 0 } },
        p: { x: 150, y: 0 },
        guidLines: [
          [
            { x: 0, y: 0 },
            { x: 160, y: 0 },
          ],
        ],
      });
    });

    test("should regard grid lines when self snapping happens", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "a", q: { x: 100, y: 50 } });
      const target = newLineSnapping({
        snappableShapes: [],
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
        gridSnapping: {
          h: [...Array(10)].map((_, i) => [
            { x: -40, y: -40 + 10 * i },
            { x: 240, y: -40 + 10 * i },
          ]),
          v: [...Array(10)].map((_, i) => [
            { x: -40 + 10 * i, y: -40 },
            { x: -40 + 10 * i, y: 240 },
          ]),
        },
      });

      // No grid near by
      expect(target.testConnection({ x: -6, y: -3 }, 0.1)).toEqual({
        p: { x: -6, y: -3 },
        guidLines: [
          [
            { x: 100, y: 50 },
            { x: -6, y: -3 },
          ],
        ],
      });

      // "Hit both vertical and horizontal grid lines"
      const res1 = target.testConnection({ x: -20, y: -11 }, 1);
      expect(res1?.p.x).toBeCloseTo(-20);
      expect(res1?.p.y).toBeCloseTo(-10);
      expect(res1?.guidLines).toHaveLength(3);
      expect(res1?.guidLines?.[1]).toEqual([
        { x: -40, y: -10 },
        { x: 240, y: -10 },
      ]);
      expect(res1?.guidLines?.[2]).toEqual([
        { x: -20, y: -40 },
        { x: -20, y: 240 },
      ]);
    });

    test("should regard grid lines when self snapping happens: hit vertical grid line", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "a", q: { x: 100, y: 50 } });
      const target = newLineSnapping({
        snappableShapes: [],
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
        gridSnapping: {
          h: [...Array(10)].map((_, i) => [
            { x: -40, y: -40 + 10 * i },
            { x: 240, y: -40 + 10 * i },
          ]),
          v: [...Array(10)].map((_, i) => [
            { x: -40 + 10 * i, y: -40 },
            { x: -40 + 10 * i, y: 240 },
          ]),
        },
      });

      // "Hit vertical grid lines"
      const res2 = target.testConnection({ x: -11, y: -11 }, 1);
      expect(res2?.p.x).toBeCloseTo(-10);
      expect(res2?.p.y).toBeCloseTo(-5);
      expect(res2?.guidLines).toHaveLength(2);
      expect(res2?.guidLines?.[1]).toEqual([
        { x: -10, y: -40 },
        { x: -10, y: 240 },
      ]);
    });

    test("should regard grid lines when self snapping happens: hit horizontal grid line", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "a", q: { x: 50, y: 100 } });
      const target = newLineSnapping({
        snappableShapes: [],
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
        gridSnapping: {
          h: [...Array(10)].map((_, i) => [
            { x: -40, y: -40 + 10 * i },
            { x: 240, y: -40 + 10 * i },
          ]),
          v: [...Array(10)].map((_, i) => [
            { x: -40 + 10 * i, y: -40 },
            { x: -40 + 10 * i, y: 240 },
          ]),
        },
      });

      const res2 = target.testConnection({ x: -11, y: -11 }, 1);
      expect(res2?.p.x).toBeCloseTo(-5);
      expect(res2?.p.y).toBeCloseTo(-10);
      expect(res2?.guidLines).toHaveLength(2);
      expect(res2?.guidLines?.[1]).toEqual([
        { x: -40, y: -10 },
        { x: 240, y: -10 },
      ]);
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
    expect(isLineSnappableShape(createShape(getCommonStruct, "rectangle", {}))).toBe(true);
    expect(isLineSnappableShape(createShape(getCommonStruct, "text", {}))).toBe(true);

    expect(isLineSnappableShape(createShape(getCommonStruct, "line", {}))).toBe(false);
    expect(isLineSnappableShape(createShape<TextShape>(getCommonStruct, "text", { lineAttached: 0.5 }))).toBe(false);
  });
});
