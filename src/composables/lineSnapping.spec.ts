import { expect, describe, test } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { newLineSnapping } from "./lineSnapping";

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
      const target = newLineSnapping({ snappableShapes, getShapeStruct: getCommonStruct });
      expect(target.testConnection({ x: -20, y: 0 }, 1)).toEqual(undefined);
      expect(target.testConnection({ x: 1, y: 1 }, 1)).toEqual({
        connection: { id: "a", rate: { x: 0, y: 0 } },
        p: { x: 0, y: 0 },
      });
      expect(target.testConnection({ x: 160, y: -5 }, 1)).toEqual({
        connection: { id: "b", rate: { x: 0.1, y: 0 } },
        p: { x: 160, y: 0 },
      });
    });
  });
});
