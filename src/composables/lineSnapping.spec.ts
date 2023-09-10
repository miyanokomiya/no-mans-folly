import { expect, describe, test } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { newLineSnapping } from "./lineSnapping";
import { LineShape } from "../shapes/line";

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
