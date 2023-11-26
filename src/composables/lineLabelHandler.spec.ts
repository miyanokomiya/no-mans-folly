import { describe, test, expect } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { LineShape } from "../shapes/line";
import { TextShape } from "../shapes/text";
import { getPatchByUpdateLabelAlign, newLineLabelHandler } from "./lineLabelHandler";
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
        },
      });

      expect(target.onModified({ group: { q: { x: 200, y: 0 } } as Partial<LineShape> })).toEqual({});
    });
  });
});

describe("getPatchByUpdateLabelAlign", () => {
  const line0 = createShape<LineShape>(getCommonStruct, "line", {
    id: "line0",
    p: { x: 0, y: 0 },
    q: { x: 100, y: 100 },
  });
  const label0 = createShape<TextShape>(getCommonStruct, "text", {
    id: "label0",
    parentId: "line0",
    lineAttached: 0.5,
    width: 10,
    height: 10,
  });

  test("should return patch object to update the label's aligns and position", () => {
    expect(getPatchByUpdateLabelAlign(line0, label0, { x: 48, y: 52 })).toEqual({
      hAlign: "center",
      vAlign: "center",
      p: { x: 45, y: 45 },
    });

    const ret1 = getPatchByUpdateLabelAlign(line0, label0, { x: 20, y: 20 });
    expect(ret1.hAlign).toBe("right");
    expect(ret1.vAlign).toBe("bottom");
    expect(ret1.p?.x).toBeCloseTo(35.05, 3);
    expect(ret1.p?.y).toBeCloseTo(35.05, 3);

    const ret2 = getPatchByUpdateLabelAlign(line0, label0, { x: 80, y: 80 });
    expect(ret2.hAlign).toBe("left");
    expect(ret2.vAlign).toBe("top");
    expect(ret2.p?.x).toBeCloseTo(54.95, 3);
    expect(ret2.p?.y).toBeCloseTo(54.95, 3);
  });

  test("should drop attributes that are same to the originals", () => {
    expect(
      getPatchByUpdateLabelAlign(line0, { ...label0, hAlign: "center", vAlign: "center" }, { x: 48, y: 52 }),
    ).toEqual({
      p: { x: 45, y: 45 },
    });
    expect(getPatchByUpdateLabelAlign(line0, { ...label0, p: { x: 45, y: 45 } }, { x: 48, y: 52 })).toEqual({
      hAlign: "center",
      vAlign: "center",
    });
  });
});
