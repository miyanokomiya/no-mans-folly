import { expect, describe, test } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { getOptimizedSegment, newLineSnapping, optimizeLinePath } from "./lineSnapping";
import { LineShape } from "../shapes/line";
import { EllipseShape } from "../shapes/ellipse";

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
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "a", q: { x: 100, y: 0 } });
      const target = newLineSnapping({ snappableShapes, getShapeStruct: getCommonStruct, movingLine, movingIndex: 1 });
      expect(target.testConnection({ x: -20, y: -10 }, 1)).toEqual(undefined);

      // Self snapped
      expect(target.testConnection({ x: -20, y: 2 }, 1)).toEqual({
        p: { x: -20, y: 0 },
        guidLines: [
          [
            { x: 0, y: 0 },
            { x: -20, y: 0 },
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
            { x: 150, y: 0 },
          ],
        ],
      });
    });

    test("should return connection result: body vertex", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "a",
        q: { x: 100, y: 100 },
        body: [{ p: { x: 50, y: 50 } }],
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
      const res = getOptimizedSegment(getCommonStruct, shapeA, shapeB);
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
      const res = getOptimizedSegment(getCommonStruct, shapeA, shapeB);
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
      const res0 = getOptimizedSegment(getCommonStruct, shapeA, shapeBottomRight);
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
      const res1 = getOptimizedSegment(getCommonStruct, shapeA, shapeBottomLeft);
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
      const res2 = getOptimizedSegment(getCommonStruct, shapeA, shapeTopLeft);
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
      const res3 = getOptimizedSegment(getCommonStruct, shapeA, shapeTopRight);
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
      const res0 = getOptimizedSegment(getCommonStruct, shapeA, shapeBottomRight);
      expect(res0?.[0]).toEqual({ x: 100, y: 0 });
      expect(res0?.[1].x).toBeGreaterThan(50);
      expect(res0?.[1].x).toBeLessThan(150);
      expect(res0?.[1].y).toBeGreaterThan(-150);
      expect(res0?.[1].y).toBeLessThan(-100);
    });
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
      const getShapeMap = () => ({ a, b, line });
      const res = optimizeLinePath(
        {
          getShapeMap,
          getShapeStruct: getCommonStruct,
        },
        line
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
      const getShapeMap = () => ({ a, b, line });
      const res = optimizeLinePath(
        {
          getShapeMap,
          getShapeStruct: getCommonStruct,
        },
        line
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
      const getShapeMap = () => ({ a, b, line });
      const res = optimizeLinePath(
        {
          getShapeMap,
          getShapeStruct: getCommonStruct,
        },
        line
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
      const getShapeMap = () => ({ a, b, line });
      const res = optimizeLinePath(
        {
          getShapeMap,
          getShapeStruct: getCommonStruct,
        },
        line
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
      const getShapeMap = () => ({ a, b, line });
      const res = optimizeLinePath(
        {
          getShapeMap,
          getShapeStruct: getCommonStruct,
        },
        line
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
      const getShapeMap = () => ({ a, b, line });
      const res = optimizeLinePath(
        {
          getShapeMap,
          getShapeStruct: getCommonStruct,
        },
        line
      );
      expect(res).toEqual({
        p: { x: 50, y: 100 },
        q: { x: 50, y: 200 },
        pConnection: { id: "a", rate: { x: 0.5, y: 1 }, optimized: true },
        qConnection: { id: "b", rate: { x: 0.5, y: 0 }, optimized: true },
      });
    });
  });
});
