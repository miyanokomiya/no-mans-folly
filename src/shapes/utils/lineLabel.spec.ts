import { describe, test, expect } from "vitest";
import { struct as textStruct } from "../text";
import { struct as lineStruct } from "../line";
import { attachLabelToLine, getLabelMargin, isLineLabelShape } from "./lineLabel";
import { newShapeComposite } from "../../composables/shapeComposite";
import { getCommonStruct } from "..";

describe("attachLabelToLine", () => {
  test("should return patch object to attach a label to a line: horizontal line", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 0 } });
    const label0 = textStruct.create({ p: { x: 20, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label0, 0)).toEqual({
      p: { x: 20, y: 0 },
      lineAttached: 0.2,
    });

    const label1 = textStruct.create({ p: { x: 20, y: -20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label1, 0)).toEqual({
      p: { x: 20, y: 0 },
      lineAttached: 0.2,
    });

    const label2 = textStruct.create({ p: { x: 20, y: -8 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label2, 0)).toEqual({
      p: { x: 20, y: 0 },
      lineAttached: 0.2,
    });
  });

  test("should return patch object to attach a label to a line: vertical line", () => {
    const line0 = lineStruct.create({ q: { x: 0, y: 100 } });
    const label0 = textStruct.create({ p: { x: 20, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label0, 0)).toEqual({
      p: { x: 0, y: 20 },
      lineAttached: 0.2,
    });

    const label1 = textStruct.create({ p: { x: -20, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label1, 0)).toEqual({
      p: { x: 0, y: 20 },
      lineAttached: 0.2,
    });

    const label2 = textStruct.create({ p: { x: -8, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label2, 0)).toEqual({
      p: { x: 0, y: 20 },
      lineAttached: 0.2,
    });
  });

  test("should return patch object to attach a label to a line: angled line1", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 100 } });
    const label0 = textStruct.create({ p: { x: 20, y: 0 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label0, 0)).toEqual({
      p: { x: 10, y: 10 },
      lineAttached: 0.1,
    });

    const label1 = textStruct.create({ p: { x: 0, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label1, 0)).toEqual({
      p: { x: 10, y: 10 },
      lineAttached: 0.1,
    });
  });

  test("should return patch object to attach a label to a line: angled line2", () => {
    const line0 = lineStruct.create({ p: { x: 0, y: 100 }, q: { x: 100, y: 0 } });
    const label0 = textStruct.create({ p: { x: 40, y: 90 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label0, 0)).toEqual({
      p: { x: 25, y: 75 },
      lineAttached: 0.25,
    });
  });

  test("should deal with rotated label", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 0 } });
    const label0 = textStruct.create({ p: { x: 20, y: 20 }, width: 20, height: 10, rotation: Math.PI / 2 });
    expect(attachLabelToLine(line0, label0, 0)).toEqual({
      p: { x: 20, y: 5 },
      lineAttached: 0.35,
    });

    const line1 = lineStruct.create({ q: { x: 0, y: 100 } });
    const label1 = textStruct.create({ p: { x: -50, y: 20 }, width: 20, height: 10, rotation: -Math.PI / 2 });
    const result1 = attachLabelToLine(line1, label1, 0);
    expect(result1?.p?.x).toBeCloseTo(-5);
    expect(result1?.p?.y).toBeCloseTo(20);
    expect(result1?.lineAttached).toBeCloseTo(0.35);

    const label2 = textStruct.create({ p: { x: 20, y: 20 }, width: 20, height: 10, rotation: Math.PI });
    const result2 = attachLabelToLine(line0, label2, 0);
    expect(result2?.p?.x).toBeCloseTo(20);
    expect(result2?.p?.y).toBeCloseTo(-10);
    expect(result2?.lineAttached).toBeCloseTo(0.4);
  });

  test("should add margin when it's supplied", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 0 } });
    const label0 = textStruct.create({ p: { x: 20, y: 20 }, width: 20, height: 10 });
    const res0 = attachLabelToLine(line0, label0, 10);
    expect(res0.lineAttached).toBeCloseTo(0.12928932);
    expect(res0.p).toEqualPoint({
      x: 20,
      y: 7.071067811,
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
    const ret0 = attachLabelToLine(line0, label0, 0);
    expect(ret0.p).toEqualPoint({ x: 49.0330875, y: -37.49026041 });
    expect(ret0.lineAttached).toBeCloseTo(0.2459, 3);

    const label1 = textStruct.create({ p: { x: 200, y: 45 }, width: 10, height: 10 });
    const ret1 = attachLabelToLine(line0, label1, 0);
    expect(ret1.p).toEqualPoint({ x: 137.49026, y: 49.0330875 });
    expect(ret1.lineAttached).toBeCloseTo(0.7459, 3);
  });

  test("should regard the line with zero length", () => {
    const line0 = lineStruct.create({ p: { x: 10, y: 30 }, q: { x: 10, y: 30 } });
    const label0 = textStruct.create({ p: { x: 20, y: 20 }, width: 10, height: 10 });
    expect(attachLabelToLine(line0, label0, 0).p).toEqualPoint({ x: 10, y: 30 });
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

  test("should return consistent anchor", () => {
    const line0 = lineStruct.create({ p: { x: 710, y: 2766 }, q: { x: 935, y: 2766 } });
    const label0 = textStruct.create({ p: { x: 785, y: 2771 }, width: 68, height: 22, vAlign: "top", hAlign: "left" });
    const patch = attachLabelToLine(line0, label0, getLabelMargin(line0));
    expect(attachLabelToLine(line0, { ...label0, ...patch }, getLabelMargin(line0))).toEqual({});
  });
});
