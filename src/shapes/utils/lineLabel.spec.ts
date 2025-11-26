import { describe, test, expect } from "vitest";
import { struct as textStruct } from "../text";
import { struct as lineStruct } from "../line";
import { attachLabelToLine, isLineLabelShape } from "./lineLabel";
import { newShapeComposite } from "../../composables/shapeComposite";
import { getCommonStruct } from "..";

describe("attachLabelToLine", () => {
  test("should return patch object to attach a label to a line: horizontal line", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 0 } });
    const label0 = textStruct.create({ p: { x: 20, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label0)).toEqual({
      p: { x: 20, y: 0 },
      hAlign: "center",
      vAlign: "top",
      lineAttached: 0.25,
    });

    const label1 = textStruct.create({ p: { x: 20, y: -20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label1)).toEqual({
      p: { x: 20, y: -10 },
      hAlign: "center",
      vAlign: "bottom",
      lineAttached: 0.25,
    });

    const label2 = textStruct.create({ p: { x: 20, y: -8 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label2)).toEqual({
      p: { x: 20, y: -5 },
      hAlign: "center",
      vAlign: "center",
      lineAttached: 0.25,
    });
  });

  test("should return patch object to attach a label to a line: vertical line", () => {
    const line0 = lineStruct.create({ q: { x: 0, y: 100 } });
    const label0 = textStruct.create({ p: { x: 20, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label0)).toEqual({
      p: { x: 0, y: 20 },
      hAlign: "left",
      vAlign: "center",
      lineAttached: 0.25,
    });

    const label1 = textStruct.create({ p: { x: -20, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label1)).toEqual({
      p: { x: -10, y: 20 },
      hAlign: "right",
      vAlign: "center",
      lineAttached: 0.25,
    });

    const label2 = textStruct.create({ p: { x: -8, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label2)).toEqual({
      p: { x: -5, y: 20 },
      hAlign: "center",
      vAlign: "center",
      lineAttached: 0.25,
    });
  });

  test("should return patch object to attach a label to a line: angled line1", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 100 } });
    const label0 = textStruct.create({ p: { x: 20, y: 0 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label0)).toEqual({
      p: { x: 15, y: 5 },
      hAlign: "left",
      vAlign: "bottom",
      lineAttached: 0.15,
    });

    const label1 = textStruct.create({ p: { x: 0, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label1)).toEqual({
      p: { x: 5, y: 15 },
      hAlign: "right",
      vAlign: "top",
      lineAttached: 0.15,
    });
  });

  test("should return patch object to attach a label to a line: angled line2", () => {
    const line0 = lineStruct.create({ p: { x: 0, y: 100 }, q: { x: 100, y: 0 } });
    const label0 = textStruct.create({ p: { x: 40, y: 90 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label0)).toEqual({
      p: { x: 25, y: 75 },
      hAlign: "left",
      vAlign: "top",
      lineAttached: 0.25,
    });
  });

  test("should deal with rotated label", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 0 } });
    const label0 = textStruct.create({ p: { x: 20, y: 20 }, width: 20, height: 10, rotation: Math.PI / 2 });
    expect(attachLabelToLine(line0, label0)).toEqual({
      p: { x: 20, y: 5 },
      hAlign: "left",
      vAlign: "center",
      lineAttached: 0.3,
    });

    const line1 = lineStruct.create({ q: { x: 0, y: 100 } });
    const label1 = textStruct.create({ p: { x: -50, y: 20 }, width: 20, height: 10, rotation: -Math.PI / 2 });
    const result1 = attachLabelToLine(line1, label1);
    expect(result1?.p?.x).toBeCloseTo(-15);
    expect(result1?.p?.y).toBeCloseTo(20);
    expect(result1?.hAlign).toBe("center");
    expect(result1?.vAlign).toBe("bottom");
    expect(result1?.lineAttached).toBeCloseTo(0.25);

    const label2 = textStruct.create({ p: { x: 20, y: 20 }, width: 20, height: 10, rotation: Math.PI });
    const result2 = attachLabelToLine(line0, label2);
    expect(result2?.p?.x).toBeCloseTo(20);
    expect(result2?.p?.y).toBeCloseTo(0);
    expect(result2?.hAlign).toBe("center");
    expect(result2?.vAlign).toBe("bottom");
    expect(result2?.lineAttached).toBeCloseTo(0.3);
  });

  test("should add margin when it's supplied", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 0 } });
    const label0 = textStruct.create({ p: { x: 20, y: 20 }, width: 20, height: 10 });
    expect(attachLabelToLine(line0, label0, 10)).toEqual({
      p: { x: 20, y: 10 },
      hAlign: "center",
      vAlign: "top",
      lineAttached: 0.3,
    });
  });

  test("should take care of curve line", () => {
    const line0 = lineStruct.create({
      q: { x: 100, y: 100 },
      body: [{ p: { x: 100, y: 0 } }],
      curves: [
        { c1: { x: 20, y: -50 }, c2: { x: 80, y: -50 } },
        { c1: { x: 150, y: 20 }, c2: { x: 150, y: 80 } },
      ],
    });
    const label0 = textStruct.create({ p: { x: 45, y: -100 }, width: 10, height: 10 });
    const ret0 = attachLabelToLine(line0, label0);
    expect(ret0.p).toEqualPoint({ x: 45.1168847, y: -47.4998576 });
    expect(ret0.hAlign).toBe("center");
    expect(ret0.vAlign).toBe("bottom");
    expect(ret0.lineAttached).toBeCloseTo(0.25, 3);

    const label1 = textStruct.create({ p: { x: 200, y: 45 }, width: 10, height: 10 });
    const ret1 = attachLabelToLine(line0, label1);
    expect(ret1.p).toEqualPoint({ x: 137.4998576, y: 45.1168847 });
    expect(ret1.hAlign).toBe("left");
    expect(ret1.vAlign).toBe("center");
    expect(ret1.lineAttached).toBeCloseTo(0.75, 3);
  });

  test("should regard the line with zero length", () => {
    const line0 = lineStruct.create({ p: { x: 10, y: 30 }, q: { x: 10, y: 30 } });
    const label0 = textStruct.create({ p: { x: 20, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label0).p).toEqualPoint({ x: 10, y: 20 });
  });
});

describe("isLineLabelShape", () => {
  test("should return true when the shape is valid line label", () => {
    const line = lineStruct.create({ id: "line" });
    const label0 = textStruct.create({ parentId: line.id, lineAttached: 0.5 });
    const label1 = textStruct.create({ parentId: line.id, lineAttached: undefined });
    const group = lineStruct.create({ id: "group" });
    const label2 = textStruct.create({ parentId: "group" });
    const label3 = textStruct.create({ parentId: "unknown" });
    const label4 = textStruct.create({ parentId: undefined });
    const shapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [line, label0, label1, label2, group, label3, label4],
    });

    expect(isLineLabelShape(shapeComposite, line), "not a text").toBe(false);
    expect(isLineLabelShape(shapeComposite, label0), "valid line label").toBe(true);
    expect(isLineLabelShape(shapeComposite, label1), "invalid lineAttached").toBe(false);
    expect(isLineLabelShape(shapeComposite, label2), "the parent isn't a line").toBe(false);
    expect(isLineLabelShape(shapeComposite, label3), "invalid parent").toBe(false);
    expect(isLineLabelShape(shapeComposite, label4), "no parent").toBe(false);
  });
});
