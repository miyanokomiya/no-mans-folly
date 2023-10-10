import { describe, test, expect } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { LineShape } from "../shapes/line";
import { TextShape } from "../shapes/text";
import { newLineLabelHandler } from "./lineLabelHandler";
import { createStrokeStyle } from "../utils/strokeStyle";
import { newShapeComposite } from "./shapeComposite";

describe("newLineLabelHandler", () => {
  describe("onModified", () => {
    test("should patch line labels", () => {
      const target = newLineLabelHandler({
        ctx: {
          getShapeComposite: () =>
            newShapeComposite({
              shapes: [
                createShape<LineShape>(getCommonStruct, "line", {
                  id: "line",
                  p: { x: 0, y: 0 },
                  q: { x: 100, y: 0 },
                  stroke: createStrokeStyle({ width: 2 }),
                }),
                createShape<TextShape>(getCommonStruct, "text", {
                  id: "label0",
                  parentId: "line",
                  lineAttached: 0.2,
                  vAlign: "center",
                  width: 20,
                  height: 10,
                }),
              ],
              getStruct: getCommonStruct,
            }),
          getShapeStruct: getCommonStruct,
        },
      });

      expect(target.onModified({ line: { q: { x: 200, y: 0 } } as Partial<LineShape> })).toEqual({
        label0: { p: { x: 47, y: -5 } },
      });

      expect(target.onModified({ label0: { p: { x: 50, y: -100 } } })).toEqual({
        label0: { p: { x: 50, y: -17 }, hAlign: "center", vAlign: "bottom", lineAttached: 0.6 },
      });

      expect(
        target.onModified({
          line: { q: { x: 200, y: 0 } } as Partial<LineShape>,
          label0: { p: { x: 50, y: -100 } },
        }),
      ).toEqual({
        label0: { p: { x: 50, y: -17 }, hAlign: "center", vAlign: "bottom", lineAttached: 0.3 },
      });
    });

    test("should not patch when a child text shape belongs to a group shape", () => {
      const target = newLineLabelHandler({
        ctx: {
          getShapeComposite: () =>
            newShapeComposite({
              shapes: [
                createShape(getCommonStruct, "group", {
                  id: "group",
                  p: { x: 0, y: 0 },
                }),
                createShape<TextShape>(getCommonStruct, "text", {
                  id: "label0",
                  parentId: "line",
                  lineAttached: 0.2,
                  vAlign: "center",
                  width: 20,
                  height: 10,
                }),
              ],
              getStruct: getCommonStruct,
            }),
          getShapeStruct: getCommonStruct,
        },
      });

      expect(target.onModified({ group: { q: { x: 200, y: 0 } } as Partial<LineShape> })).toEqual({});
    });
  });
});
