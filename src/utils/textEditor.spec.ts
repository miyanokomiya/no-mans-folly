import { expect, describe, test } from "vitest";
import { DocCompositionItem, DocCompositionLine, getCursorLocationAt } from "./textEditor";

describe("getCursorLocationAt", () => {
  test("align left: should return appropriate cursor location", () => {
    const composition: DocCompositionItem[] = [
      { char: "a", bounds: { x: 0, y: 0, width: 4, height: 10 } },
      { char: "b", bounds: { x: 4, y: 0, width: 4, height: 10 } },
      { char: "c", bounds: { x: 8, y: 0, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 12, y: 0, width: 4, height: 10 } },
      { char: "d", bounds: { x: 0, y: 10, width: 4, height: 10 } },
      { char: "e", bounds: { x: 4, y: 10, width: 4, height: 10 } },
      { char: "f", bounds: { x: 8, y: 10, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 12, y: 10, width: 4, height: 10 } },
    ];
    const compositionLines: DocCompositionLine[] = [
      { y: 0, height: 10, outputs: [{ insert: "abc\n" }] },
      { y: 0, height: 10, outputs: [{ insert: "def\n" }] },
    ];
    expect(getCursorLocationAt(composition, compositionLines, { x: -1, y: -1 })).toEqual({
      x: 0,
      y: 0,
    });
    expect(getCursorLocationAt(composition, compositionLines, { x: 1, y: -1 })).toEqual({
      x: 0,
      y: 0,
    });
    expect(getCursorLocationAt(composition, compositionLines, { x: 3, y: -1 })).toEqual({
      x: 1,
      y: 0,
    });
  });

  test("align center: should return appropriate cursor location", () => {
    const composition: DocCompositionItem[] = [
      { char: "a", bounds: { x: 4, y: 0, width: 4, height: 10 } },
      { char: "b", bounds: { x: 8, y: 0, width: 4, height: 10 } },
      { char: "c", bounds: { x: 12, y: 0, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 16, y: 0, width: 4, height: 10 } },
      { char: "d", bounds: { x: 4, y: 10, width: 4, height: 10 } },
      { char: "e", bounds: { x: 8, y: 10, width: 4, height: 10 } },
      { char: "f", bounds: { x: 12, y: 10, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 16, y: 10, width: 4, height: 10 } },
    ];
    const compositionLines: DocCompositionLine[] = [
      { y: 0, height: 10, outputs: [{ insert: "abc\n" }] },
      { y: 0, height: 10, outputs: [{ insert: "def\n" }] },
    ];
    expect(getCursorLocationAt(composition, compositionLines, { x: 1, y: 1 })).toEqual({
      x: 0,
      y: 0,
    });
    expect(getCursorLocationAt(composition, compositionLines, { x: 7, y: 16 })).toEqual({
      x: 1,
      y: 1,
    });
  });

  test("should ignore line break", () => {
    const composition: DocCompositionItem[] = [
      { char: "a", bounds: { x: 0, y: 0, width: 4, height: 10 } },
      { char: "b", bounds: { x: 4, y: 0, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 8, y: 0, width: 4, height: 10 } },
      { char: "d", bounds: { x: 0, y: 10, width: 4, height: 10 } },
      { char: "e", bounds: { x: 4, y: 10, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 8, y: 10, width: 4, height: 10 } },
    ];
    const compositionLines: DocCompositionLine[] = [
      { y: 0, height: 10, outputs: [{ insert: "ab\n" }] },
      { y: 0, height: 10, outputs: [{ insert: "de\n" }] },
    ];
    expect(getCursorLocationAt(composition, compositionLines, { x: 9, y: 2 })).toEqual({
      x: 2,
      y: 0,
    });
    expect(getCursorLocationAt(composition, compositionLines, { x: 9, y: 14 })).toEqual({
      x: 2,
      y: 1,
    });
  });

  test("vertical align center: should return appropriate cursor location", () => {
    const composition: DocCompositionItem[] = [
      { char: "a", bounds: { x: 0, y: 10, width: 4, height: 10 } },
      { char: "b", bounds: { x: 4, y: 10, width: 4, height: 10 } },
      { char: "c", bounds: { x: 8, y: 10, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 12, y: 10, width: 4, height: 10 } },
      { char: "d", bounds: { x: 0, y: 20, width: 4, height: 10 } },
      { char: "e", bounds: { x: 4, y: 20, width: 4, height: 10 } },
      { char: "f", bounds: { x: 8, y: 20, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 12, y: 20, width: 4, height: 10 } },
    ];
    const compositionLines: DocCompositionLine[] = [
      { y: 10, height: 10, outputs: [{ insert: "abc\n" }] },
      { y: 20, height: 10, outputs: [{ insert: "def\n" }] },
    ];
    expect(getCursorLocationAt(composition, compositionLines, { x: 5, y: 11 })).toEqual({
      x: 1,
      y: 0,
    });
  });
});
