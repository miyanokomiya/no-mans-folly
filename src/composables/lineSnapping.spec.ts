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
import { RoundedRectangleShape } from "../shapes/polygons/roundedRectangle";

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
    ];

    test("should return connection result: End vertex", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 100 } });
      const target = newLineSnapping({
        snappableShapes,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
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
      expect(target.testConnection({ x: 199, y: 51 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0.5, y: 0.5 } },
        outlineSrc: "b",
        p: { x: 200, y: 50 },
      });

      // Self snapped & Outline snapped
      expect(target.testConnection({ x: 165, y: -5 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0.15, y: 0 } },
        outlineSrc: "b",
        p: { x: 165, y: 0 },
        guidLines: [
          [
            { x: 0, y: 0 },
            { x: 165, y: 0 },
          ],
        ],
      });
    });

    test("should prioritize line outline than guideline when they're parallel", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 100 } });
      const otherline = createShape<LineShape>(getCommonStruct, "line", {
        id: "otherline",
        body: [{ p: { x: 0, y: 100 } }],
        q: { x: 100, y: 100 },
      });
      const sc = newShapeComposite({ getStruct: getCommonStruct, shapes: [otherline] });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: [[otherline.id, sc.getSnappingLines(otherline)]],
      });
      const target = newLineSnapping({
        snappableShapes: [otherline],
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      expect(target.testConnection({ x: 30, y: 102 }, 1)).toEqual({
        outlineSrc: "otherline",
        p: { x: 30, y: 100 },
      });
      expect(target.testConnection({ x: 80, y: 98 }, 1)).toEqual({
        outlineSrc: "otherline",
        p: { x: 80, y: 100 },
      });
    });

    test("should snap to the center of a shape while snapping to two grid lines", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 100 } });
      const sc = newShapeComposite({ getStruct: getCommonStruct, shapes: snappableShapes });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, sc.getSnappingLines(s)]),
      });
      const target = newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      expect(target.testConnection({ x: 199, y: 51 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0.5, y: 0.5 } },
        outlineSrc: "b",
        p: { x: 200, y: 50 },
        shapeSnappingResult: {
          diff: { x: 1, y: -1 },
          intervalTargets: [],
          targets: [
            {
              id: "b",
              line: [
                { x: 200, y: 0 },
                { x: 200, y: 100 },
              ],
            },
            {
              id: "b",
              line: [
                { x: 150, y: 50 },
                { x: 250, y: 50 },
              ],
            },
          ],
        },
      });
    });

    test("should snap to the center of a shape while snapping to a grid line and self segment", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 200, y: 0 },
        q: { x: 100, y: 100 },
      });
      const sc = newShapeComposite({ getStruct: getCommonStruct, shapes: snappableShapes });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, sc.getSnappingLines(s)]),
      });
      const target = newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      expect(target.testConnection({ x: 199, y: 51 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0.5, y: 0.5 } },
        outlineSrc: "b",
        p: { x: 200, y: 50 },
        guidLines: [
          [
            { x: 200, y: 0 },
            { x: 200, y: 51 },
          ],
        ],
      });
    });

    test("should connect to the snapped shape: snapped to a line and other shape type", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 200, y: -100 },
        q: { x: 100, y: -50 },
      });
      const otherline = createShape<LineShape>(getCommonStruct, "line", {
        id: "otherline",
        p: { x: 0, y: -100 },
        q: { x: 220, y: 0 },
      });
      const snappableShapes2 = [...snappableShapes, otherline];
      const sc = newShapeComposite({ getStruct: getCommonStruct, shapes: snappableShapes2 });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes2.map((s) => [s.id, sc.getSnappingLines(s)]),
      });
      const target = newLineSnapping({
        snappableShapes: snappableShapes2,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      expect(target.testConnection({ x: 220, y: 1 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0.7, y: 0 } },
        outlineSrc: "b",
        outlineSubSrc: "otherline",
        p: { x: 220, y: 0 },
      });
    });

    test("should inherit the connection from the snapped vertex: snapped to other two lines", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 200, y: -100 },
        q: { x: 100, y: -50 },
      });
      const otherline = createShape<LineShape>(getCommonStruct, "line", {
        id: "otherline",
        p: { x: 0, y: -100 },
        q: { x: 220, y: 0 },
        // Note: Set wrong connection to check if the result inherits it.
        qConnection: { id: "z", rate: { x: 0.1, y: 0 } },
      });
      const otherline2 = createShape<LineShape>(getCommonStruct, "line", {
        ...otherline,
        id: "otherline2",
        p: { x: -100, y: -100 },
      });
      const snappableShapes2 = [...snappableShapes, otherline, otherline2];
      const sc = newShapeComposite({ getStruct: getCommonStruct, shapes: snappableShapes2 });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes2.map((s) => [s.id, sc.getSnappingLines(s)]),
      });
      const target = newLineSnapping({
        snappableShapes: snappableShapes2,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      expect(target.testConnection({ x: 220, y: 1 }, 1)).toEqual({
        connection: { id: "z", rate: { x: 0.1, y: 0 } },
        outlineSrc: "z",
        outlineSubSrc: "otherline",
        p: { x: 220, y: 0 },
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
        guidLines: [
          [
            { x: 230, y: -500 },
            { x: 230, y: 500 },
          ],
        ],
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
        guidLines: [
          [
            { x: -500, y: 30 },
            { x: 500, y: 30 },
          ],
        ],
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

    test("should snap to shape outline along other line", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "moving",
        p: { x: -200, y: -200 },
        q: { x: -100, y: -200 },
      });
      const line = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 20, y: -50 },
        q: { x: 20, y: 50 },
      });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: [
          [
            "line",
            {
              h: [],
              v: [
                [
                  { x: 20, y: -50 },
                  { x: 20, y: 50 },
                ],
              ],
            },
          ],
        ],
      });

      const target1 = newLineSnapping({
        snappableShapes: [...snappableShapes, line],
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      expect(target1.testConnection({ x: 18, y: 1 }, 1)).toEqual({
        connection: { id: "a", rate: { x: 0.2, y: 0 } },
        outlineSrc: "a",
        outlineSubSrc: "line",
        p: { x: 20, y: 0 },
      });

      const target2 = newLineSnapping({
        snappableShapes: [
          createShape<EllipseShape>(getCommonStruct, "ellipse", { id: "e", rx: 50, ry: 25 }),
          createShape<LineShape>(getCommonStruct, "line", { id: "line", p: { x: 20, y: -50 }, q: { x: 20, y: 50 } }),
        ],
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      const result2 = target2.testConnection({ x: 20, y: 5 }, 1);
      expect(result2?.outlineSrc).toBe("e");
      expect(result2?.connection?.rate).toEqualPoint({ x: 0.2, y: 0.1 });
    });

    test("should snap to shape outline along other line: Snap a shape then snap to a line", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "moving",
        p: { x: -200, y: -200 },
        q: { x: -100, y: -200 },
      });
      const line = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 20, y: -50 },
        q: { x: 20, y: 50 },
      });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: [
          [
            "a",
            {
              h: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 0 },
                ],
              ],
              v: [],
            },
          ],
        ],
      });

      const target1 = newLineSnapping({
        snappableShapes: [line, ...snappableShapes],
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      expect(target1.testConnection({ x: 18, y: 1 }, 1)).toEqual({
        connection: { id: "a", rate: { x: 0.2, y: 0 } },
        outlineSrc: "a",
        outlineSubSrc: "line",
        p: { x: 20, y: 0 },
      });

      const target2 = newLineSnapping({
        snappableShapes: [...snappableShapes, line],
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      expect(target2.testConnection({ x: 18, y: 1 }, 1)).toEqual({
        connection: { id: "a", rate: { x: 0.2, y: 0 } },
        outlineSrc: "a",
        outlineSubSrc: "line",
        p: { x: 20, y: 0 },
      });
    });

    test("should snap to shape outline along other line: the intersection of grid lines of shapes", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "moving",
        p: { x: -200, y: -200 },
        q: { x: -100, y: -200 },
      });
      const line = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 20, y: -50 },
        q: { x: 20, y: 50 },
      });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: [
          [
            "a",
            {
              h: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 0 },
                ],
              ],
              v: [],
            },
          ],
          [
            "line",
            {
              h: [],
              v: [
                [
                  { x: 20, y: -50 },
                  { x: 20, y: 50 },
                ],
              ],
            },
          ],
        ],
      });

      const target1 = newLineSnapping({
        snappableShapes: [...snappableShapes, line],
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      expect(target1.testConnection({ x: 18, y: 1 }, 1)).toEqual({
        connection: { id: "a", rate: { x: 0.2, y: 0 } },
        outlineSrc: "a",
        outlineSubSrc: "line",
        p: { x: 20, y: 0 },
      });
    });

    test("should snap to an intersection between shape outlines", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "moving",
        p: { x: -200, y: -200 },
        q: { x: -100, y: -200 },
      });
      const line1 = createShape<LineShape>(getCommonStruct, "line", {
        id: "line1",
        findex: "aA",
        p: { x: 0, y: 0 },
        q: { x: 100, y: 100 },
        curves: [{ d: { x: 0, y: 10 } }],
      });
      const line2 = createShape<LineShape>(getCommonStruct, "line", {
        id: "line2",
        findex: "aB",
        p: { x: 100, y: 0 },
        q: { x: 0, y: 100 },
        curves: [{ d: { x: 0, y: -20 } }],
      });

      const target1 = newLineSnapping({
        snappableShapes: [line1, line2],
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      const result1 = target1.testConnection({ x: 57, y: 70 }, 1);
      expect(result1).toEqual({
        outlineSrc: line2.id,
        outlineSubSrc: line1.id,
        p: expect.anything(),
      });
      const sc = newShapeComposite({ getStruct: getCommonStruct, shapes: [line1, line2] });
      expect(sc.isPointOn(line1, result1!.p)).toBe(true);
      expect(sc.isPointOn(line2, result1!.p)).toBe(true);
    });

    test("should connect to shape's outline even if a gridline and shape's outline are overlapped", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "moving",
        p: { x: -200, y: -200 },
        q: { x: -100, y: -200 },
      });
      const rect = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "rect",
        p: { x: 0, y: 0 },
        width: 100,
        height: 100,
      });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: [
          [
            rect.id,
            {
              h: [
                [
                  { x: -50, y: 0 },
                  { x: 50, y: 0 },
                ],
              ],
              v: [
                [
                  { x: 0, y: -50 },
                  { x: 0, y: 50 },
                ],
              ],
            },
          ],
        ],
      });

      const target1 = newLineSnapping({
        snappableShapes: [rect],
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });
      const result1 = target1.testConnection({ x: 20, y: 1 }, 1);
      expect(result1).toEqual({
        connection: { id: "rect", rate: { x: 0.2, y: 0 } },
        outlineSrc: rect.id,
        p: { x: 20, y: 0 },
        guidLines: [
          [
            { x: -50, y: 0 },
            { x: 50, y: 0 },
          ],
        ],
        shapeSnappingResult: {
          diff: { x: 0, y: -1 },
          intervalTargets: [],
          targets: [
            {
              id: rect.id,
              line: [
                { x: -50, y: 0 },
                { x: 50, y: 0 },
              ],
            },
          ],
        },
      });
    });

    test("should snap to shape outline that is parallel to self snapped constraint", () => {
      const movingLine = createShape<LineShape>(getCommonStruct, "line", {
        id: "moving",
        p: { x: -200, y: 0 },
        q: { x: -100, y: 0 },
      });
      const shapeSnapping = newShapeSnapping({ shapeSnappingList: [] });
      const target = newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine,
        movingIndex: 1,
      });

      expect(target.testConnection({ x: 18, y: 1 }, 1)).toEqual({
        connection: { id: "a", rate: { x: 0.18, y: 0 } },
        outlineSrc: "a",
        p: { x: 18, y: 0 },
        guidLines: [
          [
            { x: -200, y: 0 },
            { x: 18, y: 0 },
          ],
        ],
      });
      expect(target.testConnection({ x: 2, y: 1 }, 1)).toEqual({
        connection: { id: "a", rate: { x: 0, y: 0 } },
        outlineSrc: "a",
        p: { x: 0, y: 0 },
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
        guidLines: [
          [
            { x: 230, y: -500 },
            { x: 230, y: 500 },
          ],
        ],
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
        guidLines: [
          [
            { x: -500, y: 30 },
            { x: 500, y: 30 },
          ],
        ],
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

    test("should snap to grid lines", () => {
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

    test("should snap to grid lines based on shape bounds with preserving the original line", () => {
      const movingLine0 = createShape<LineShape>(getCommonStruct, "line", {
        id: "a",
        p: { x: 0, y: 30 },
        q: { x: 40, y: 30 },
      });
      const sc = newShapeComposite({ getStruct: getCommonStruct, shapes: snappableShapes });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: [[snappableShapes[1].id, sc.getSnappingLines(snappableShapes[1])]],
      });

      const target0 = newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine: movingLine0,
        movingIndex: 1,
      });
      expect(target0.testConnection({ x: 148, y: 31 }, 1), "connected to the shape").toEqual({
        connection: { id: "b", rate: { x: 0, y: 0.3 } },
        outlineSrc: "b",
        p: { x: 150, y: 30 },
        guidLines: [
          [
            { x: 0, y: 30 },
            { x: 150, y: 30 },
          ],
        ],
      });

      const target1 = newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine: { ...movingLine0, p: { x: 0, y: -30 }, q: { x: 40, y: -30 } },
        movingIndex: 1,
      });
      expect(target1.testConnection({ x: 148, y: -31 }, 1), "not connected to the shape").toEqual({
        p: { x: 150, y: -30 },
        guidLines: [
          [
            { x: 0, y: -30 },
            { x: 150, y: -30 },
          ],
        ],
        shapeSnappingResult: {
          diff: { x: 2, y: 1 },
          intervalTargets: [],
          targets: [
            {
              id: "b",
              line: [
                { x: 150, y: -31 },
                { x: 150, y: 100 },
              ],
            },
          ],
        },
      });
    });

    test("should snap to the intersection of interval grid and shape outline", () => {
      const movingLine0 = createShape<LineShape>(getCommonStruct, "line", {
        id: "moving",
        p: { x: 0, y: 30 },
        q: { x: 40, y: 30 },
      });
      const sc = newShapeComposite({ getStruct: getCommonStruct, shapes: snappableShapes });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, sc.getSnappingLines(s)]),
      });

      const target0 = newLineSnapping({
        snappableShapes: [
          ...snappableShapes,
          createShape<LineShape>(getCommonStruct, "line", {
            id: "line0",
            p: { x: -150, y: 0 },
            q: { x: 0, y: -150 },
          }),
          createShape<LineShape>(getCommonStruct, "line", {
            id: "line1",
            p: { x: 200, y: 0 },
            q: { x: 350, y: -150 },
          }),
        ],
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine: movingLine0,
        movingIndex: 1,
      });
      expect(target0.testConnection({ x: -52, y: -102 }, 1), "connected to the shape").toEqual({
        outlineSrc: "line0",
        p: { x: -50, y: -100 },
        guidLines: [
          [
            { x: -50, y: -102 },
            { x: -50, y: -52 },
          ],
        ],
        shapeSnappingResult: {
          diff: { x: 2, y: 0 },
          targets: [],
          intervalTargets: [
            {
              afterId: "b",
              beforeId: "a",
              direction: "v",
              lines: [
                [
                  { x: -50, y: -100 },
                  { x: 0, y: -100 },
                ],
                [
                  { x: 100, y: -100 },
                  { x: 150, y: -100 },
                ],
              ],
            },
          ],
        },
      });
      expect(target0.testConnection({ x: 298, y: -102 }, 1), "connected to the shape").toEqual({
        outlineSrc: "line1",
        p: { x: 300, y: -100 },
        guidLines: [
          [
            { x: 300, y: -102 },
            { x: 300, y: -52 },
          ],
        ],
        shapeSnappingResult: {
          diff: { x: 2, y: 0 },
          targets: [],
          intervalTargets: [
            {
              afterId: "b",
              beforeId: "a",
              direction: "v",
              lines: [
                [
                  { x: 100, y: -100 },
                  { x: 150, y: -100 },
                ],
                [
                  { x: 250, y: -100 },
                  { x: 300, y: -100 },
                ],
              ],
            },
          ],
        },
      });
    });

    test("should snap to the intersection of grid lines based on shape bounds", () => {
      const movingLine0 = createShape<LineShape>(getCommonStruct, "line", {
        id: "a",
        p: { x: 0, y: 30 },
        q: { x: 40, y: 30 },
      });
      const sc = newShapeComposite({ getStruct: getCommonStruct, shapes: snappableShapes });
      const shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, sc.getSnappingLines(s)]),
        gridSnapping: {
          h: [],
          v: [
            [
              { x: 80, y: -100 },
              { x: 80, y: 100 },
            ],
            [
              { x: 120, y: -100 },
              { x: 120, y: 100 },
            ],
            [
              { x: 170, y: -100 },
              { x: 170, y: 100 },
            ],
          ],
        },
      });

      const target0 = newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine: movingLine0,
        movingIndex: 1,
      });
      expect(target0.testConnection({ x: 78, y: 1 }, 1), "connected to the shape").toEqual({
        connection: { id: "a", rate: { x: 0.8, y: 0 } },
        outlineSrc: "a",
        p: { x: 80, y: 0 },
        shapeSnappingResult: {
          diff: { x: 2, y: -1 },
          intervalTargets: [],
          targets: [
            {
              id: "GRID",
              line: [
                { x: 80, y: -100 },
                { x: 80, y: 100 },
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
        },
      });

      const target1 = newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: getCommonStruct,
        movingLine: { ...movingLine0, p: { x: 0, y: -30 }, q: { x: 40, y: -30 } },
        movingIndex: 1,
      });
      expect(target1.testConnection({ x: 118, y: 1 }, 1), "not connected to the shape").toEqual({
        p: { x: 120, y: 0 },
        shapeSnappingResult: {
          diff: { x: 2, y: -1 },
          intervalTargets: [],
          targets: [
            {
              id: "GRID",
              line: [
                { x: 120, y: -100 },
                { x: 120, y: 100 },
              ],
            },
            {
              id: "a",
              line: [
                { x: 0, y: 0 },
                { x: 120, y: 0 },
              ],
            },
          ],
        },
      });

      expect(target1.testConnection({ x: 168, y: 1 }, 1), "connected to the shape").toEqual({
        connection: { id: "b", rate: { x: 0.2, y: 0 } },
        outlineSrc: "b",
        p: { x: 170, y: 0 },
        shapeSnappingResult: {
          diff: { x: 2, y: -1 },
          intervalTargets: [],
          targets: [
            {
              id: "GRID",
              line: [
                { x: 170, y: -100 },
                { x: 170, y: 100 },
              ],
            },
            {
              id: "b",
              line: [
                { x: 150, y: 0 },
                { x: 250, y: 0 },
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

  test("should reconnect lines to the outline of the shape: rectangle -> two_sided_arrow", () => {
    const arrow = createShape<TwoSidedArrowShape>(getCommonStruct, "two_sided_arrow", {
      id: "a",
      width: 100,
      height: 50,
    });
    const shapeComposite = newShapeComposite({ shapes: [line, shapeA], getStruct: getCommonStruct });
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

  test("should ignore connections that are not on the outline", () => {
    const shapeB = createShape<RoundedRectangleShape>(getCommonStruct, "rounded_rectangle", {
      id: "b",
      p: { x: 0, y: 0 },
      width: 100,
      height: 100,
      rx: 10,
      ry: 10,
    });
    const lineB = createShape<LineShape>(getCommonStruct, "line", {
      id: "line_b",
      p: { x: -50, y: -50 },
      q: { x: 0, y: 0 },
      qConnection: { id: shapeB.id, rate: { x: 0, y: 0 } },
    });
    const shapeComposite = newShapeComposite({ shapes: [lineB, shapeB], getStruct: getCommonStruct });
    const res = patchLinesConnectedToShapeOutline(shapeComposite, {
      ...shapeB,
      rx: 20,
      ry: 20,
    } as RoundedRectangleShape);
    expect(res).toEqual({});
  });

  test("should ignore connections unrelated to the shape", () => {
    const shapeComposite = newShapeComposite({ shapes: [line, shapeA], getStruct: getCommonStruct });
    const res = patchLinesConnectedToShapeOutline(shapeComposite, { ...shapeA, id: "b" });
    expect(res).toEqual({});
  });
});
