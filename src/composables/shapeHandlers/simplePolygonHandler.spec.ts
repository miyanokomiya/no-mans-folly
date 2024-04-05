import { describe, test, expect } from "vitest";
import { newSimplePolygonHandler } from "./simplePolygonHandler";
import { newShapeComposite } from "../shapeComposite";
import { createShape, getCommonStruct } from "../../shapes";

describe("newSimplePolygonHandler", () => {
  describe("hitTest", () => {
    test("should return hit result", () => {
      const shapeComposite = newShapeComposite({
        getStruct: getCommonStruct,
        shapes: [createShape(getCommonStruct, "rectangle", { id: "a" })],
      });
      const handler = newSimplePolygonHandler({
        getShapeComposite: () => shapeComposite,
        targetId: "a",
        getAnchors: () => [
          ["1", { x: 100, y: 0 }],
          ["2", { x: 200, y: 0 }],
        ],
      });
      expect(handler.hitTest({ x: 90, y: 0 }, 1)).toEqual(undefined);
      expect(handler.hitTest({ x: 98, y: 0 }, 1)).toEqual({ type: "1" });
      expect(handler.hitTest({ x: 201, y: 0 }, 1)).toEqual({ type: "2" });
    });
  });
});
