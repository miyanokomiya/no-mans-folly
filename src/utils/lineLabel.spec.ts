import { describe, test, expect } from "vitest";
import { struct as textStruct } from "../shapes/text";
import { struct as lineStruct } from "../shapes/line";
import { attachLabelToLine } from "./lineLabel";

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
});
