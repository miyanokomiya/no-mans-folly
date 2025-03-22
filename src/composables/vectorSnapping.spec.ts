import { describe, test, expect } from "vitest";
import { newVectorSnapping, newVectorsSnapping } from "./vectorSnapping";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { newShapeComposite } from "./shapeComposite";
import { ShapeSnappingLines } from "../shapes/core";

describe("newVectorSnapping", () => {
  const shapeA = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "a",
    p: { x: 0, y: 0 },
    width: 100,
    height: 100,
  });
  const shapeB = { ...shapeA, p: { x: 200, y: 0 } };
  const shapeComposite = newShapeComposite({ shapes: [shapeA, shapeB], getStruct: getCommonStruct });
  const gridSnapping: ShapeSnappingLines = {
    h: [
      [
        { x: -200, y: 0 },
        { x: 200, y: 0 },
      ],
    ],
    v: [
      [
        { x: 20, y: -200 },
        { x: 20, y: 200 },
      ],
    ],
  };

  describe("hitTest", () => {
    test("should snap to outline of a shape", () => {
      const target = newVectorSnapping({
        origin: { x: 20, y: -50 },
        vector: { x: 0, y: 10 },
        snappableShapes: shapeComposite.shapes,
        getShapeStruct: shapeComposite.getShapeStruct,
        gridSnapping,
      });
      expect(target.hitTest({ x: 21, y: 1 }, 1)).toEqual({
        p: { x: 20, y: 0 },
        v: { x: -1, y: -1 },
        snapped: "shape",
        guidLines: [
          [
            { x: 20, y: -50 },
            { x: 20, y: 0 },
          ],
        ],
      });
    });

    test("should snap to grid lines when there's no snappable shape near by", () => {
      const target = newVectorSnapping({
        origin: { x: 20, y: -50 },
        vector: { x: 0, y: 10 },
        snappableShapes: [],
        getShapeStruct: shapeComposite.getShapeStruct,
        gridSnapping,
      });
      expect(target.hitTest({ x: 21, y: 1 }, 1)).toEqual({
        p: { x: 20, y: 0 },
        v: { x: -1, y: -1 },
        snapped: "grid",
        guidLines: [
          gridSnapping.h[0],
          [
            { x: 20, y: -50 },
            { x: 20, y: 0 },
          ],
        ],
      });
    });

    test("should snap to the origin when the option is on", () => {
      const target = newVectorSnapping({
        origin: { x: 20, y: -50 },
        vector: { x: 0, y: 10 },
        snappableShapes: [],
        getShapeStruct: shapeComposite.getShapeStruct,
        gridSnapping,
        snappableOrigin: true,
      });
      expect(target.hitTest({ x: 21, y: -49 }, 1)).toEqual({
        p: { x: 20, y: -50 },
        v: { x: -1, y: -1 },
        snapped: "origin",
      });
    });

    test("should return the pedal when there's no snappable target near by", () => {
      const target = newVectorSnapping({
        origin: { x: 20, y: -50 },
        vector: { x: 0, y: 10 },
        snappableShapes: [],
        getShapeStruct: shapeComposite.getShapeStruct,
        gridSnapping,
        snappableOrigin: true,
      });
      expect(target.hitTest({ x: 21, y: 50 }, 1)).toEqual({
        p: { x: 20, y: 50 },
        v: { x: -1, y: 0 },
        guidLines: [
          [
            { x: 20, y: -50 },
            { x: 20, y: 50 },
          ],
        ],
      });
    });
  });
});

describe("newVectorsSnapping", () => {
  const shapeA = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "a",
    p: { x: 0, y: 0 },
    width: 100,
    height: 100,
  });
  const shapeB = { ...shapeA, p: { x: 200, y: 0 } };
  const shapeComposite = newShapeComposite({ shapes: [shapeA, shapeB], getStruct: getCommonStruct });
  const gridSnapping: ShapeSnappingLines = {
    h: [
      [
        { x: -200, y: 0 },
        { x: 200, y: 0 },
      ],
    ],
    v: [
      [
        { x: 20, y: -200 },
        { x: 20, y: 200 },
      ],
    ],
  };

  describe("hitTest", () => {
    test("should proc multiple vector snappings", () => {
      const target = newVectorsSnapping({
        origins: [
          { x: 20, y: -50 },
          { x: 30, y: -50 },
        ],
        vector: { x: 0, y: 10 },
        snappableShapes: shapeComposite.shapes,
        getShapeStruct: shapeComposite.getShapeStruct,
        gridSnapping,
      });

      expect(
        target.hitTest(
          [
            { x: 21, y: 1 },
            { x: 29, y: 1 },
          ],
          1,
        ),
        "single close result",
      ).toEqual({
        v: { x: -1, y: -1 },
        results: [{ p: { x: 20, y: 0 }, v: { x: -1, y: -1 }, snapped: "shape", guidLines: expect.anything() }],
      });

      expect(
        target.hitTest(
          [
            { x: 21, y: 1 },
            { x: 31, y: 1 },
          ],
          1,
        ),
        "multiple close result",
      ).toEqual({
        v: { x: -1, y: -1 },
        results: [
          { p: { x: 20, y: 0 }, v: { x: -1, y: -1 }, snapped: "shape", guidLines: expect.anything() },
          { p: { x: 30, y: 0 }, v: { x: -1, y: -1 }, snapped: "shape", guidLines: expect.anything() },
        ],
      });
    });
  });
});
