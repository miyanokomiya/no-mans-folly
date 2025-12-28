import { expect, describe, test } from "vitest";
import {
  applyAttrInfoToDocOutput,
  applyRangeWidthToLineWord,
  convertLineWordToComposition,
  convertRawTextToDoc,
  createListIndexPath,
  getCursorLocationAt,
  getDeltaAndCursorByBackspace,
  getDeltaAndCursorByDelete,
  getDeltaByApplyBlockStyleToDoc,
  getDeltaByApplyDocStyle,
  getDeltaByApplyInlineStyleToDoc,
  getDocLength,
  getDocRawLength,
  getLineEndIndex,
  getLineHeadIndex,
  getLineHeight,
  getLineTextUpToX,
  getLinkAt,
  getNewInlineAttributesAt,
  getNextListIndent,
  getOutputSelection,
  getRawCursor,
  getWordRangeAtCursor,
  hasDocNoContent,
  isCursorInDoc,
  isLinebreak,
  isUrlText,
  mergeDocAttrInfo,
  sliceDocOutput,
  splitDocOutputByLineBreak,
  splitOutputsIntoLineWord,
  splitTextByURL,
  splitToSegments,
} from "./textEditor";
import {
  DocCompositionItem,
  DocCompositionLine,
  LINK_STYLE_ATTRS,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINEHEIGHT,
} from "./textEditorCore";

describe("isLinebreak", () => {
  test("should return true when the character is line break", () => {
    expect(isLinebreak("\n")).toBe(true);
    expect(isLinebreak("\r\n")).toBe(true);
    expect(isLinebreak("a")).toBe(false);
    expect(isLinebreak(" ")).toBe(false);
    expect(isLinebreak("\t")).toBe(false);
  });
});

describe("isUrlText", () => {
  test("should return true when the text can be URL", () => {
    expect(isUrlText("example.com")).toBe(false);
    expect(isUrlText("http://example.com")).toBe(true);
    expect(isUrlText("abc https://example.com abc")).toBe(true);
  });

  test("should return true when the text is exactly URL", () => {
    expect(isUrlText("http://example.com", true)).toBe(true);
    expect(isUrlText("abc https://example.com abc", true)).toBe(false);
    expect(isUrlText(" https://example.com", true)).toBe(false);
    // Tail part can be anithing
    expect(isUrlText("https://example.com ", true)).toBe(true);
  });
});

describe("splitTextByURL", () => {
  test("should return split text with URL information", () => {
    expect(splitTextByURL("example.com")).toEqual([{ val: "example.com", isUrl: false }]);
    expect(splitTextByURL("http://example.com")).toEqual([{ val: "http://example.com", isUrl: true }]);
    expect(splitTextByURL("ab http://example.com cd")).toEqual([
      { val: "ab ", isUrl: false },
      { val: "http://example.com", isUrl: true },
      { val: " cd", isUrl: false },
    ]);
    expect(splitTextByURL("http://example.com http://example.com")).toEqual([
      { val: "http://example.com", isUrl: true },
      { val: " ", isUrl: false },
      { val: "http://example.com", isUrl: true },
    ]);
  });
});

describe("convertRawTextToDoc", () => {
  test("should convert given text into a doc", () => {
    expect(convertRawTextToDoc("multi\nlines")).toEqual([{ insert: "multi" }, { insert: "\n" }, { insert: "lines" }]);
    expect(convertRawTextToDoc("with link http://example.com")).toEqual([
      { insert: "with link " },
      { insert: "http://example.com", attributes: { ...LINK_STYLE_ATTRS, link: "http://example.com" } },
    ]);
  });
});

describe("splitToSegments", () => {
  test("should return text segments based on graphemes", () => {
    expect(splitToSegments("f😃a😄e😜")).toEqual(["f", "😃", "a", "😄", "e", "😜"]);
  });
});

describe("getDocLength", () => {
  test("should return doc length based on graphemes", () => {
    expect(getDocLength([{ insert: "a" }, { insert: "b" }, { insert: "c" }])).toBe(3);
    expect(getDocLength([{ insert: "a" }, { insert: "😄" }, { insert: "c" }])).toBe(3);
  });
});

describe("hasDocNoContent", () => {
  test("should return true when doc has no content", () => {
    expect(hasDocNoContent([])).toBe(true);
    expect(hasDocNoContent([{ insert: "\n" }])).toBe(true);
    expect(hasDocNoContent([{ insert: " " }])).toBe(false);
    expect(hasDocNoContent([{ insert: "a" }])).toBe(false);
    expect(hasDocNoContent([{ insert: "a" }, { insert: "b" }])).toBe(false);
    expect(hasDocNoContent([{ insert: "\n" }, { insert: "\n" }])).toBe(false);
  });
});

describe("getDocRawLength", () => {
  test("should return doc length based on doc delta", () => {
    expect(getDocRawLength([{ insert: "a" }, { insert: "b" }, { insert: "c" }])).toBe(3);
    expect(getDocRawLength([{ insert: "a" }, { insert: "😄" }, { insert: "c" }])).toBe(4);
  });
});

describe("getRawCursor", () => {
  test("should return raw cursor", () => {
    expect(
      getRawCursor(
        [
          { char: "a", bounds: { x: 0, y: 0, width: 4, height: 10 } },
          { char: "b", bounds: { x: 4, y: 0, width: 4, height: 10 } },
          { char: "c", bounds: { x: 8, y: 0, width: 4, height: 10 } },
        ],
        3,
      ),
    ).toBe(3);

    expect(
      getRawCursor(
        [
          { char: "a", bounds: { x: 0, y: 0, width: 4, height: 10 } },
          { char: "😄", bounds: { x: 4, y: 0, width: 4, height: 10 } },
          { char: "c", bounds: { x: 8, y: 0, width: 4, height: 10 } },
        ],
        3,
      ),
    ).toBe(4);
  });
});

describe("getLineTextUpToX", () => {
  test("should return text up to given x", () => {
    const line: DocCompositionLine = {
      y: 0,
      height: 10,
      fontheight: 10,
      outputs: [{ insert: "a" }, { insert: "b😄" }, { insert: "c" }, { insert: "\n" }],
    };
    expect(getLineTextUpToX(line, 0)).toBe("");
    expect(getLineTextUpToX(line, 1)).toBe("a");
    expect(getLineTextUpToX(line, 2)).toBe("ab");
    expect(getLineTextUpToX(line, 3)).toBe("ab😄");
    expect(getLineTextUpToX(line, 4)).toBe("ab😄c");
    expect(getLineTextUpToX(line, 5)).toBe("ab😄c");
    expect(getLineTextUpToX(line, 6)).toBe("ab😄c");
  });
});

describe("getLineHeight", () => {
  test("should return line height derived from the attributes", () => {
    expect(getLineHeight({})).toBe(DEFAULT_FONT_SIZE * DEFAULT_LINEHEIGHT);
    expect(getLineHeight({ size: 10 })).toBe(10 * DEFAULT_LINEHEIGHT);
    expect(getLineHeight({ size: 10 }, { lineheight: 2 })).toBe(20);
  });
});

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
      { y: 0, height: 10, fontheight: 10, outputs: [{ insert: "abc\n" }] },
      { y: 10, height: 10, fontheight: 10, outputs: [{ insert: "def\n" }] },
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
      { y: 0, height: 10, fontheight: 10, outputs: [{ insert: "abc\n" }] },
      { y: 10, height: 10, fontheight: 10, outputs: [{ insert: "def\n" }] },
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
      { y: 0, height: 10, fontheight: 10, outputs: [{ insert: "ab\n" }] },
      { y: 10, height: 10, fontheight: 10, outputs: [{ insert: "de\n" }] },
    ];
    expect(getCursorLocationAt(composition, compositionLines, { x: 11, y: 2 })).toEqual({
      x: 2,
      y: 0,
    });
    expect(getCursorLocationAt(composition, compositionLines, { x: 11, y: 14 })).toEqual({
      x: 2,
      y: 1,
    });
  });

  test("should not ignore the last item in a line when it's not line break", () => {
    const composition: DocCompositionItem[] = [
      { char: "a", bounds: { x: 0, y: 0, width: 4, height: 10 } },
      { char: "b", bounds: { x: 4, y: 0, width: 4, height: 10 } },
      { char: "d", bounds: { x: 0, y: 10, width: 4, height: 10 } },
      { char: "e", bounds: { x: 4, y: 10, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 8, y: 10, width: 4, height: 10 } },
    ];
    const compositionLines: DocCompositionLine[] = [
      { y: 0, height: 10, fontheight: 10, outputs: [{ insert: "ab" }] },
      { y: 10, height: 10, fontheight: 10, outputs: [{ insert: "de\n" }] },
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
      { y: 10, height: 10, fontheight: 10, outputs: [{ insert: "abc\n" }] },
      { y: 20, height: 10, fontheight: 10, outputs: [{ insert: "def\n" }] },
    ];
    expect(getCursorLocationAt(composition, compositionLines, { x: 5, y: 11 })).toEqual({
      x: 1,
      y: 0,
    });
  });
});

describe("isCursorInDoc", () => {
  test("should return true when the cursor in the doc", () => {
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
      { y: 0, height: 10, fontheight: 10, outputs: [{ insert: "abc\n" }] },
      { y: 10, height: 10, fontheight: 10, outputs: [{ insert: "def\n" }] },
    ];
    expect(isCursorInDoc(composition, compositionLines, { x: -1, y: -1 })).toBe(false);
    expect(isCursorInDoc(composition, compositionLines, { x: 1, y: -1 })).toBe(false);
    expect(isCursorInDoc(composition, compositionLines, { x: 3, y: -1 })).toBe(false);
    expect(isCursorInDoc(composition, compositionLines, { x: 0, y: 0 })).toBe(true);
    expect(isCursorInDoc(composition, compositionLines, { x: 3, y: 1 })).toBe(true);
    expect(isCursorInDoc(composition, compositionLines, { x: 3, y: 10 })).toBe(true);
    expect(isCursorInDoc(composition, compositionLines, { x: 3, y: 11 })).toBe(true);
    expect(isCursorInDoc(composition, compositionLines, { x: 3, y: 21 })).toBe(false);
    expect(isCursorInDoc(composition, compositionLines, { x: 16, y: 1 })).toBe(true);
    expect(isCursorInDoc(composition, compositionLines, { x: 17, y: 1 })).toBe(false);
  });

  test("should return true when the cursor in the doc: empty doc", () => {
    const composition: DocCompositionItem[] = [{ char: "\n", bounds: { x: 0, y: 0, width: 0, height: 0 } }];
    const compositionLines: DocCompositionLine[] = [{ y: 0, height: 0, fontheight: 10, outputs: [{ insert: "\n" }] }];
    expect(isCursorInDoc(composition, compositionLines, { x: -1, y: -1 })).toBe(false);
    expect(isCursorInDoc(composition, compositionLines, { x: 1, y: 1 })).toBe(false);
  });
});

describe("getLineEndIndex", () => {
  test("should return next linebreak index", () => {
    const composition: DocCompositionItem[] = [
      { char: "a", bounds: { x: 0, y: 0, width: 4, height: 10 } },
      { char: "b", bounds: { x: 4, y: 0, width: 4, height: 10 } },
      { char: "c", bounds: { x: 8, y: 0, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 12, y: 0, width: 4, height: 10 } },
      { char: "d", bounds: { x: 0, y: 10, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 12, y: 10, width: 4, height: 10 } },
    ];
    expect(getLineEndIndex(composition, 0)).toBe(3);
    expect(getLineEndIndex(composition, 3)).toBe(3);
    expect(getLineEndIndex(composition, 4)).toBe(5);
    expect(getLineEndIndex(composition, 5)).toBe(5);
  });
});

describe("getLineHeadIndex", () => {
  test("should return previous linebreak index + 1", () => {
    const composition: DocCompositionItem[] = [
      { char: "a", bounds: { x: 0, y: 0, width: 4, height: 10 } },
      { char: "b", bounds: { x: 4, y: 0, width: 4, height: 10 } },
      { char: "c", bounds: { x: 8, y: 0, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 12, y: 0, width: 4, height: 10 } },
      { char: "d", bounds: { x: 0, y: 10, width: 4, height: 10 } },
      { char: "\n", bounds: { x: 12, y: 10, width: 4, height: 10 } },
    ];
    expect(getLineHeadIndex(composition, 0)).toBe(0);
    expect(getLineHeadIndex(composition, 3)).toBe(0);
    expect(getLineHeadIndex(composition, 4)).toBe(4);
    expect(getLineHeadIndex(composition, 5)).toBe(4);
  });
});

describe("getDeltaByApplyBlockStyleToDoc", () => {
  test("should return doc delta to apply the block attributes", () => {
    expect(
      getDeltaByApplyBlockStyleToDoc([{ insert: "ab\ncd\n" }, { insert: "\n" }, { insert: "e\n" }], { align: "right" }),
    ).toEqual([
      { retain: 2 },
      { retain: 1, attributes: { align: "right" } },
      { retain: 2 },
      { retain: 1, attributes: { align: "right" } },
      { retain: 1, attributes: { align: "right" } },
      { retain: 1 },
      { retain: 1, attributes: { align: "right" } },
    ]);
  });

  test("should return doc delta for empty doc", () => {
    expect(getDeltaByApplyBlockStyleToDoc([], { align: "right" })).toEqual([
      { insert: "\n", attributes: { align: "right", direction: "middle" } },
    ]);
  });
});

describe("getDeltaByApplyDocStyle", () => {
  test("should return doc delta to apply the doc attributes", () => {
    expect(
      getDeltaByApplyDocStyle([{ insert: "ab\ncd\n" }, { insert: "\n" }, { insert: "e\n" }], { align: "right" }),
    ).toEqual([{ retain: 8 }, { retain: 1, attributes: { align: "right" } }]);
  });

  test("should return doc delta for empty doc", () => {
    expect(getDeltaByApplyDocStyle([], { align: "right" })).toEqual([
      { insert: "\n", attributes: { align: "right", direction: "middle" } },
    ]);
  });
});

describe("getDeltaByApplyInlineStyleToDoc", () => {
  test("should return doc delta to apply the doc attributes", () => {
    expect(
      getDeltaByApplyInlineStyleToDoc([{ insert: "ab\ncd\n" }, { insert: "\n" }, { insert: "e\n" }], {
        align: "right",
      }),
    ).toEqual([{ retain: 9, attributes: { align: "right" } }]);
  });

  test("should return doc delta for empty doc", () => {
    expect(getDeltaByApplyInlineStyleToDoc([], { align: "right" })).toEqual([
      { insert: "\n", attributes: { align: "right", direction: "middle" } },
    ]);
  });
});

describe("getNewInlineAttributesAt", () => {
  test("should inherit previous item if it exists: no sibling lines", () => {
    const attrs0 = { color: "#aaa" };
    const attrs1 = { color: "#bbb" };
    const lines = [
      [
        { insert: "a", attributes: attrs0 },
        { insert: "b", attributes: attrs1 },
        { insert: "c", attributes: attrs0 },
        { insert: "d", attributes: attrs1 },
        { insert: "e", attributes: attrs0 },
      ],
    ];
    expect(getNewInlineAttributesAt(lines, { x: 0, y: 0 })).toEqual(attrs0);
    expect(getNewInlineAttributesAt(lines, { x: 1, y: 0 })).toEqual(attrs0);
    expect(getNewInlineAttributesAt(lines, { x: 2, y: 0 })).toEqual(attrs1);
    expect(getNewInlineAttributesAt(lines, { x: 3, y: 0 })).toEqual(attrs0);
    expect(getNewInlineAttributesAt(lines, { x: 4, y: 0 })).toEqual(attrs1);
    expect(getNewInlineAttributesAt(lines, { x: 5, y: 0 })).toEqual(attrs0);
    expect(getNewInlineAttributesAt(lines, { x: 6, y: 0 })).toEqual(attrs0);
    expect(getNewInlineAttributesAt(lines, { x: 7, y: 0 })).toEqual(attrs0);
  });

  test("should inherit previous item if it exists: with sibling lines", () => {
    const attrs0 = { color: "#aaa" };
    const attrs1 = { color: "#bbb" };
    const lines = [
      [
        { insert: "a", attributes: attrs0 },
        { insert: "b", attributes: attrs1 },
      ],
      [
        { insert: "a", attributes: attrs0 },
        { insert: "b", attributes: attrs1 },
      ],
      [
        { insert: "a", attributes: attrs0 },
        { insert: "b", attributes: attrs1 },
      ],
    ];
    expect(getNewInlineAttributesAt(lines, { x: 0, y: 1 })).toEqual(attrs1);
    expect(getNewInlineAttributesAt(lines, { x: 1, y: 1 })).toEqual(attrs0);
    expect(getNewInlineAttributesAt(lines, { x: 2, y: 1 })).toEqual(attrs1);
  });

  test("should inherit next item if previous item is line break: with broken lines", () => {
    const attrs0 = { color: "#aaa" };
    const attrs1 = { color: "#bbb" };
    const lines = [
      [
        { insert: "a", attributes: attrs0 },
        { insert: "\n", attributes: attrs1 },
      ],
      [
        { insert: "a", attributes: attrs0 },
        { insert: "\n", attributes: attrs1 },
      ],
      [
        { insert: "a", attributes: attrs0 },
        { insert: "b", attributes: attrs1 },
      ],
    ];
    expect(getNewInlineAttributesAt(lines, { x: 0, y: 1 })).toEqual(attrs0);
    expect(getNewInlineAttributesAt(lines, { x: 1, y: 1 })).toEqual(attrs0);
    expect(getNewInlineAttributesAt(lines, { x: 2, y: 1 })).toEqual(attrs0);
  });

  test("should delete link related attributes when the position isn't inside link: no sibling lines", () => {
    const linkAttrs = { link: "link" };
    const otherAttrs = { color: "#aaa" };
    const lines = [
      [
        { insert: "a", attributes: linkAttrs },
        { insert: "b", attributes: linkAttrs },
        { insert: "c", attributes: linkAttrs },
        { insert: "d", attributes: otherAttrs },
        { insert: "e", attributes: otherAttrs },
        { insert: "\n", attributes: linkAttrs },
      ],
    ];
    expect(getNewInlineAttributesAt(lines, { x: 0, y: 0 })).toEqual({});
    expect(getNewInlineAttributesAt(lines, { x: 1, y: 0 })).toEqual(linkAttrs);
    expect(getNewInlineAttributesAt(lines, { x: 2, y: 0 })).toEqual(linkAttrs);
    expect(getNewInlineAttributesAt(lines, { x: 3, y: 0 })).toEqual({});
    expect(getNewInlineAttributesAt(lines, { x: 4, y: 0 })).toEqual(otherAttrs);
    expect(getNewInlineAttributesAt(lines, { x: 5, y: 0 })).toEqual(otherAttrs);
    expect(getNewInlineAttributesAt(lines, { x: 6, y: 0 })).toEqual({});
    expect(getNewInlineAttributesAt(lines, { x: 7, y: 0 })).toEqual({});
  });

  test("should delete link related attributes when the position isn't inside link: with sibling lines", () => {
    const linkAttrs = { link: "link" };
    const otherAttrs = { color: "#aaa" };
    const lines0 = [
      [
        { insert: "a", attributes: otherAttrs },
        { insert: "b", attributes: linkAttrs },
      ],
      [
        { insert: "a", attributes: linkAttrs },
        { insert: "b", attributes: linkAttrs },
        { insert: "c", attributes: otherAttrs },
      ],
      [
        { insert: "a", attributes: linkAttrs },
        { insert: "b", attributes: otherAttrs },
      ],
    ];
    expect(getNewInlineAttributesAt(lines0, { x: 0, y: 1 })).toEqual(linkAttrs);
    expect(getNewInlineAttributesAt(lines0, { x: 2, y: 1 })).toEqual({});
    expect(getNewInlineAttributesAt(lines0, { x: 3, y: 1 })).toEqual(otherAttrs);

    const lines1 = [
      [
        { insert: "a", attributes: otherAttrs },
        { insert: "b", attributes: otherAttrs },
      ],
      [
        { insert: "a", attributes: linkAttrs },
        { insert: "b", attributes: linkAttrs },
        { insert: "c", attributes: otherAttrs },
      ],
      [
        { insert: "a", attributes: otherAttrs },
        { insert: "b", attributes: otherAttrs },
      ],
    ];
    expect(getNewInlineAttributesAt(lines1, { x: 0, y: 1 })).toEqual(otherAttrs);
    expect(getNewInlineAttributesAt(lines1, { x: 2, y: 1 })).toEqual({});
    expect(getNewInlineAttributesAt(lines1, { x: 3, y: 1 })).toEqual(otherAttrs);

    const lines2 = [
      [
        { insert: "a", attributes: linkAttrs },
        { insert: "b", attributes: otherAttrs },
      ],
      [
        { insert: "a", attributes: otherAttrs },
        { insert: "b", attributes: otherAttrs },
        { insert: "c", attributes: otherAttrs },
      ],
      [
        { insert: "a", attributes: linkAttrs },
        { insert: "b", attributes: otherAttrs },
      ],
    ];
    expect(getNewInlineAttributesAt(lines2, { x: 0, y: 1 })).toEqual(otherAttrs);
    expect(getNewInlineAttributesAt(lines2, { x: 2, y: 1 })).toEqual(otherAttrs);
  });
});

describe("mergeDocAttrInfo", () => {
  test("should return merge attribute info with certain priority", () => {
    expect(
      mergeDocAttrInfo({
        cursor: { size: 1, align: "left", direction: "top", indent: 1 },
        block: { size: 2, align: "center", direction: "middle", indent: 0 },
        doc: { size: 3, align: "right", direction: "bottom" },
      }),
    ).toEqual({ size: 1, align: "center", direction: "bottom", indent: 0 });
  });
});

describe("sliceDocOutput", () => {
  test("should return sliced output", () => {
    const doc = [{ insert: "abc" }, { insert: "def" }, { insert: "ghi" }];
    expect(sliceDocOutput(doc, 0, 0)).toEqual([{ insert: "" }]);
    expect(sliceDocOutput(doc, 0, 1)).toEqual([{ insert: "a" }]);
    expect(sliceDocOutput(doc, 0, 2)).toEqual([{ insert: "ab" }]);
    expect(sliceDocOutput(doc, 0, 3)).toEqual([{ insert: "abc" }]);
    expect(sliceDocOutput(doc, 0, 4)).toEqual([{ insert: "abc" }, { insert: "d" }]);
    expect(sliceDocOutput(doc, 0, 8)).toEqual([{ insert: "abc" }, { insert: "def" }, { insert: "gh" }]);
    expect(sliceDocOutput(doc, 0, 9)).toEqual([{ insert: "abc" }, { insert: "def" }, { insert: "ghi" }]);

    expect(sliceDocOutput(doc, 1, 4)).toEqual([{ insert: "bc" }, { insert: "d" }]);
    expect(sliceDocOutput(doc, 2, 8)).toEqual([{ insert: "c" }, { insert: "def" }, { insert: "gh" }]);
    expect(sliceDocOutput(doc, 3, 9)).toEqual([{ insert: "def" }, { insert: "ghi" }]);

    expect(sliceDocOutput(doc, 4, 5)).toEqual([{ insert: "e" }]);
    expect(sliceDocOutput(doc, 4, 6)).toEqual([{ insert: "ef" }]);
  });
});

describe("sliptDocOutputByLineBreak", () => {
  test("should return splited doc output", () => {
    expect(splitDocOutputByLineBreak([{ insert: "ab\ncd\nef\n" }])).toEqual([
      { insert: "ab" },
      { insert: "\n" },
      { insert: "cd" },
      { insert: "\n" },
      { insert: "ef" },
      { insert: "\n" },
    ]);
  });
});

describe("applyAttrInfoToDocOutput", () => {
  test("should return doc output applied attrs", () => {
    const attrs = { size: 1, align: "right" } as const;
    expect(applyAttrInfoToDocOutput([{ insert: "ab\ncd\nef\n" }], attrs)).toEqual([
      { insert: "ab", attributes: attrs },
      { insert: "\n", attributes: attrs },
      { insert: "cd", attributes: attrs },
      { insert: "\n", attributes: attrs },
      { insert: "ef", attributes: attrs },
      { insert: "\n", attributes: attrs },
    ]);
  });
});

describe("splitOutputsIntoLineWord", () => {
  test("should return splitted doc information", () => {
    const attrs0 = { size: 1 } as const;
    const attrs1 = { size: 3 } as const;
    expect(
      splitOutputsIntoLineWord([
        { insert: "ab c\nd", attributes: attrs0 },
        { insert: "e f\n", attributes: attrs1 },
      ]),
    ).toEqual([
      [
        [
          ["a", 0, attrs0],
          ["b", 0, attrs0],
        ],
        [[" ", 0, attrs0]],
        [["c", 0, attrs0]],
        [["\n", 0, attrs0]],
      ],
      [
        [
          ["d", 0, attrs0],
          ["e", 0, attrs1],
        ],
        [[" ", 0, attrs1]],
        [["f", 0, attrs1]],
        [["\n", 0, attrs1]],
      ],
    ]);

    expect(
      splitOutputsIntoLineWord(
        [
          { insert: "ab c", attributes: attrs0 },
          { insert: "e f\n", attributes: attrs1 },
        ],
        new Map([
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
          [4, 4],
          [5, 5],
          [6, 6],
          [7, 7],
        ]),
      ),
    ).toEqual([
      [
        [
          ["a", 0, attrs0],
          ["b", 1, attrs0],
        ],
        [[" ", 2, attrs0]],
        [
          ["c", 3, attrs0],
          ["e", 4, attrs1],
        ],
        [[" ", 5, attrs1]],
        [["f", 6, attrs1]],
        [["\n", 7, attrs1]],
      ],
    ]);

    expect(splitOutputsIntoLineWord([{ insert: "  ab c nd\n", attributes: attrs1 }])).toEqual([
      [
        [[" ", 0, attrs1]],
        [[" ", 0, attrs1]],
        [
          ["a", 0, attrs1],
          ["b", 0, attrs1],
        ],
        [[" ", 0, attrs1]],
        [["c", 0, attrs1]],
        [[" ", 0, attrs1]],
        [
          ["n", 0, attrs1],
          ["d", 0, attrs1],
        ],
        [["\n", 0, attrs1]],
      ],
    ]);

    expect(
      splitOutputsIntoLineWord([
        { insert: "ab\n", attributes: attrs1 },
        { insert: "\n", attributes: attrs1 },
      ]),
    ).toEqual([
      [
        [
          ["a", 0, attrs1],
          ["b", 0, attrs1],
        ],
        [["\n", 0, attrs1]],
      ],
      [[["\n", 0, attrs1]]],
    ]);
  });

  test("should split multiple byte words into individual words", () => {
    const attrs0 = { size: 1 } as const;
    expect(splitOutputsIntoLineWord([{ insert: "こabここ\n", attributes: attrs0 }])).toEqual([
      [
        [["こ", 0, attrs0]],
        [
          ["a", 0, attrs0],
          ["b", 0, attrs0],
        ],
        [["こ", 0, attrs0]],
        [["こ", 0, attrs0]],
        [["\n", 0, attrs0]],
      ],
    ]);
    expect(splitOutputsIntoLineWord([{ insert: "😃a😄😜\n", attributes: attrs0 }])).toEqual([
      [[["😃", 0, attrs0]], [["a", 0, attrs0]], [["😄", 0, attrs0]], [["😜", 0, attrs0]], [["\n", 0, attrs0]]],
    ]);
  });
});

describe("applyRangeWidthToLineWord", () => {
  test("should return splitted doc information redargind the range width", () => {
    expect(
      applyRangeWidthToLineWord(
        [
          [
            [
              ["a", 3],
              ["b", 3],
              ["c", 3],
              ["d", 3],
              ["e", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        10,
      ),
    ).toEqual([
      [
        [
          [
            [
              [
                ["a", 3],
                ["b", 3],
                ["c", 3],
              ],
            ],
            undefined,
          ],
          [
            [
              [
                ["d", 3],
                ["e", 3],
              ],
              [
                [
                  "\n",
                  0,
                  {
                    align: "right",
                  },
                ],
              ],
            ],
            undefined,
          ],
        ],
        {
          align: "right",
        },
      ],
    ]);

    expect(
      applyRangeWidthToLineWord(
        [
          [
            [["a", 3]],
            [[" ", 3]],
            [
              ["c", 3],
              ["d", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        10,
      ),
    ).toEqual([
      [
        [
          [[[["a", 3]], [[" ", 3]]], undefined],
          [
            [
              [
                ["c", 3],
                ["d", 3],
              ],
              [
                [
                  "\n",
                  0,
                  {
                    align: "right",
                  },
                ],
              ],
            ],
            undefined,
          ],
        ],
        {
          align: "right",
        },
      ],
    ]);

    expect(
      applyRangeWidthToLineWord(
        [
          [
            [
              ["a", 3],
              ["b", 3],
            ],
            [[" ", 3]],
            [
              ["d", 1],
              ["e", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        10,
      ),
    ).toEqual([
      [
        [
          [
            [
              [
                ["a", 3],
                ["b", 3],
              ],
              [[" ", 3]],
            ],
            undefined,
          ],
          [
            [
              [
                ["d", 1],
                ["e", 3],
              ],
              [
                [
                  "\n",
                  0,
                  {
                    align: "right",
                  },
                ],
              ],
            ],
            undefined,
          ],
        ],
        {
          align: "right",
        },
      ],
    ]);

    expect(
      applyRangeWidthToLineWord(
        [
          [
            [
              ["a", 3],
              ["b", 3],
            ],
            [[" ", 7]],
            [
              ["d", 1],
              ["e", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        10,
      ),
    ).toEqual([
      [
        [
          [
            [
              [
                ["a", 3],
                ["b", 3],
              ],
            ],
            undefined,
          ],
          [[[[" ", 7]]], undefined],
          [
            [
              [
                ["d", 1],
                ["e", 3],
              ],
              [
                [
                  "\n",
                  0,
                  {
                    align: "right",
                  },
                ],
              ],
            ],
            undefined,
          ],
        ],
        {
          align: "right",
        },
      ],
    ]);

    expect(
      applyRangeWidthToLineWord(
        [
          [
            [
              ["a", 3],
              ["b", 3],
              ["c", 3],
              ["d", 3],
              ["e", 3],
              ["f", 3],
              ["g", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        10,
      ),
    ).toEqual([
      [
        [
          [
            [
              [
                ["a", 3],
                ["b", 3],
                ["c", 3],
              ],
            ],
            undefined,
          ],
          [
            [
              [
                ["d", 3],
                ["e", 3],
                ["f", 3],
              ],
            ],
            undefined,
          ],
          [
            [
              [["g", 3]],
              [
                [
                  "\n",
                  0,
                  {
                    align: "right",
                  },
                ],
              ],
            ],
            undefined,
          ],
        ],
        {
          align: "right",
        },
      ],
    ]);
  });

  test("practical case 1", () => {
    expect(
      applyRangeWidthToLineWord(
        [
          [
            [
              ["c", 1],
              ["r", 1],
              ["e", 1],
              ["a", 1],
              ["t", 1],
              ["e", 1],
            ],
            [[" ", 1]],
            [["a", 1]],
            [[" ", 1]],
            [
              ["r", 1],
              ["e", 1],
              ["l", 1],
              ["a", 1],
              ["t", 1],
              ["i", 1],
              ["v", 1],
              ["e", 1],
            ],
            [[" ", 1]],
            [
              ["p", 1],
              ["o", 1],
              ["s", 1],
              ["i", 1],
              ["t", 1],
            ],
            [[" ", 1]],
            [
              ["f", 1],
              ["i", 1],
              ["x", 1],
              ["a", 1],
              ["t", 1],
              ["e", 1],
              ["d", 1],
            ],
            [[" ", 1]],
            [
              ["t", 1],
              ["o", 1],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        12,
      ),
    ).toEqual([
      [
        [
          [
            [
              [
                ["c", 1],
                ["r", 1],
                ["e", 1],
                ["a", 1],
                ["t", 1],
                ["e", 1],
              ],
              [[" ", 1]],
              [["a", 1]],
              [[" ", 1]],
            ],
            undefined,
          ],
          [
            [
              [
                ["r", 1],
                ["e", 1],
                ["l", 1],
                ["a", 1],
                ["t", 1],
                ["i", 1],
                ["v", 1],
                ["e", 1],
              ],
              [[" ", 1]],
            ],
            undefined,
          ],
          [
            [
              [
                ["p", 1],
                ["o", 1],
                ["s", 1],
                ["i", 1],
                ["t", 1],
              ],
              [[" ", 1]],
            ],
            undefined,
          ],
          [
            [
              [
                ["f", 1],
                ["i", 1],
                ["x", 1],
                ["a", 1],
                ["t", 1],
                ["e", 1],
                ["d", 1],
              ],
              [[" ", 1]],
              [
                ["t", 1],
                ["o", 1],
              ],
              [
                [
                  "\n",
                  0,
                  {
                    align: "right",
                  },
                ],
              ],
            ],
            undefined,
          ],
        ],
        {
          align: "right",
        },
      ],
    ]);
  });

  test("practical case 2", () => {
    expect(
      applyRangeWidthToLineWord(
        [
          [
            [
              ["a", 3],
              ["b", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        10,
      ),
    ).toEqual([
      [
        [
          [
            [
              [
                ["a", 3],
                ["b", 3],
              ],
              [
                [
                  "\n",
                  0,
                  {
                    align: "right",
                  },
                ],
              ],
            ],
            undefined,
          ],
        ],
        {
          align: "right",
        },
      ],
    ]);

    expect(
      applyRangeWidthToLineWord(
        [
          [
            [
              ["a", 3],
              ["b", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
          [[["\n", 0, { align: "right" }]]],
        ],
        10,
      ),
    ).toEqual([
      [
        [
          [
            [
              [
                ["a", 3],
                ["b", 3],
              ],
              [
                [
                  "\n",
                  0,
                  {
                    align: "right",
                  },
                ],
              ],
            ],
            undefined,
          ],
        ],
        {
          align: "right",
        },
      ],
      [
        [
          [
            [
              [
                [
                  "\n",
                  0,
                  {
                    align: "right",
                  },
                ],
              ],
            ],
            undefined,
          ],
        ],
        {
          align: "right",
        },
      ],
    ]);
  });

  test("should be one line when a letter is within exact width", () => {
    expect(
      applyRangeWidthToLineWord(
        [
          [
            [
              ["a", 1],
              ["b", 1],
              ["c", 1],
            ],
            [["\n", 0]],
          ],
        ],
        3,
      ),
    ).toEqual([
      [
        [
          [
            [
              [
                ["a", 1],
                ["b", 1],
                ["c", 1],
              ],
              [["\n", 0]],
            ],
            undefined,
          ],
        ],
        undefined,
      ],
    ]);

    expect(
      applyRangeWidthToLineWord(
        [
          [
            [
              ["a", 1],
              ["b", 1],
              ["c", 1],
            ],
            [["\n", 0]],
          ],
        ],
        2.99999,
      ),
    ).toEqual([
      [
        [
          [
            [
              [
                ["a", 1],
                ["b", 1],
              ],
            ],
            undefined,
          ],
          [[[["c", 1]], [["\n", 0]]], undefined],
        ],
        undefined,
      ],
    ]);
  });
});

describe("getWordRangeAtCursor", () => {
  test("should return word range", () => {
    const comp = [
      { char: "a" },
      { char: " " },
      { char: "w" },
      { char: "o" },
      { char: "r" },
      { char: "d" },
      { char: "." },
    ];
    expect(getWordRangeAtCursor(comp, 0)).toEqual([0, 1]);
    expect(getWordRangeAtCursor(comp, 1)).toEqual([1, 1]);
    expect(getWordRangeAtCursor(comp, 2)).toEqual([2, 4]);
    expect(getWordRangeAtCursor(comp, 3)).toEqual([2, 4]);
    expect(getWordRangeAtCursor(comp, 4)).toEqual([2, 4]);
    expect(getWordRangeAtCursor(comp, 5)).toEqual([2, 4]);
    expect(getWordRangeAtCursor(comp, 6)).toEqual([6, 1]);

    const comp1 = [{ char: "a" }, { char: "\n" }, { char: "b" }, { char: "\n" }];
    expect(getWordRangeAtCursor(comp1, 0)).toEqual([0, 1]);
    expect(getWordRangeAtCursor(comp1, 1)).toEqual([1, 1]);
    expect(getWordRangeAtCursor(comp1, 2)).toEqual([2, 1]);
    expect(getWordRangeAtCursor(comp1, 3)).toEqual([3, 1]);
  });
});

describe("getOutputSelection", () => {
  const bounds = { x: 0, y: 0, width: 4, height: 10 };
  const composition = [
    { char: "a", bounds },
    { char: "b", bounds },
    { char: "😄", bounds },
    { char: "😄", bounds },
    { char: "c", bounds },
    { char: "d", bounds },
    { char: "\n", bounds },
  ];
  const nocontent = [{ char: "\n", bounds }];
  const empty: DocCompositionItem[] = [];

  test("should return raw selection", () => {
    expect(getOutputSelection(empty, 0, 0)).toEqual(0);
    expect(getOutputSelection(nocontent, 0, 0)).toEqual(0);
    expect(getOutputSelection(composition, 0, 1)).toEqual(1);
    expect(getOutputSelection(composition, 0, 2)).toEqual(2);
    expect(getOutputSelection(composition, 0, 3)).toEqual(4);
    expect(getOutputSelection(composition, 0, 4)).toEqual(6);
    expect(getOutputSelection(composition, 1, 2)).toEqual(3);
  });
});

describe("getDeltaAndCursorByBackspace", () => {
  const bounds = { x: 0, y: 0, width: 4, height: 10 };
  const composition = [
    { char: "a", bounds },
    { char: "b", bounds },
    { char: "😄", bounds },
    { char: "😄", bounds },
    { char: "c", bounds },
    { char: "d", bounds },
    { char: "\n", bounds },
  ];
  const nocontent = [{ char: "\n", bounds }];
  const empty: DocCompositionItem[] = [];

  test("should return delta and next cursor: no target", () => {
    expect(getDeltaAndCursorByBackspace({ composition: empty, lines: [] }, 0, 0)).toEqual({
      delta: [],
      cursor: 0,
    });
    expect(getDeltaAndCursorByBackspace({ composition: nocontent, lines: [] }, 0, 0)).toEqual({
      delta: [],
      cursor: 0,
    });
  });

  test("should return delta and next cursor", () => {
    expect(getDeltaAndCursorByBackspace({ composition, lines: [] }, 1, 0)).toEqual({
      delta: [{ retain: 0 }, { delete: 1 }],
      cursor: 0,
    });
    expect(getDeltaAndCursorByBackspace({ composition, lines: [] }, 2, 0)).toEqual({
      delta: [{ retain: 1 }, { delete: 1 }],
      cursor: 1,
    });
    expect(getDeltaAndCursorByBackspace({ composition, lines: [] }, 1, 1)).toEqual({
      delta: [{ retain: 1 }, { delete: 1 }],
      cursor: 1,
    });
    expect(getDeltaAndCursorByBackspace({ composition, lines: [] }, 0, 2)).toEqual({
      delta: [{ retain: 0 }, { delete: 2 }],
      cursor: 0,
    });
  });

  test("should return delta and next cursor: emoji", () => {
    expect(getDeltaAndCursorByBackspace({ composition, lines: [] }, 3, 0)).toEqual({
      delta: [{ retain: 2 }, { delete: 2 }],
      cursor: 2,
    });
    expect(getDeltaAndCursorByBackspace({ composition, lines: [] }, 4, 0)).toEqual({
      delta: [{ retain: 4 }, { delete: 2 }],
      cursor: 3,
    });
    expect(getDeltaAndCursorByBackspace({ composition, lines: [] }, 2, 1)).toEqual({
      delta: [{ retain: 2 }, { delete: 2 }],
      cursor: 2,
    });
    expect(getDeltaAndCursorByBackspace({ composition, lines: [] }, 2, 2)).toEqual({
      delta: [{ retain: 2 }, { delete: 4 }],
      cursor: 2,
    });
    expect(getDeltaAndCursorByBackspace({ composition, lines: [] }, 1, 2)).toEqual({
      delta: [{ retain: 1 }, { delete: 3 }],
      cursor: 1,
    });
  });

  describe("Regarding retain block attrs", () => {
    const composition: DocCompositionItem[] = [
      { char: "a", bounds },
      { char: "b", bounds },
      { char: "\n", bounds },
      { char: "c", bounds },
      { char: "d", bounds },
      { char: "\n", bounds },
    ];
    const lines: DocCompositionLine[] = [
      {
        y: 0,
        height: 10,
        fontheight: 10,
        outputs: [{ insert: "ab" }, { insert: "\n", attributes: { list: "bullet", indent: 1 } }],
      },
      {
        y: 10,
        height: 10,
        fontheight: 10,
        outputs: [{ insert: "cd" }, { insert: "\n", attributes: { list: "ordered", indent: 2 } }],
      },
    ];

    test("should retain previous line attrs when nothing selected", () => {
      expect(getDeltaAndCursorByBackspace({ composition, lines }, 2, 0)).toEqual({
        delta: [{ retain: 1 }, { delete: 1 }],
        cursor: 1,
      });
      expect(getDeltaAndCursorByBackspace({ composition, lines }, 3, 0)).toEqual({
        delta: [{ retain: 2 }, { delete: 1 }, { retain: 2 }, { retain: 1, attributes: { list: "bullet", indent: 1 } }],
        cursor: 2,
      });
      expect(getDeltaAndCursorByBackspace({ composition, lines }, 4, 0)).toEqual({
        delta: [{ retain: 3 }, { delete: 1 }],
        cursor: 3,
      });
    });

    test("should retain current line attrs when multiple lines selected", () => {
      expect(getDeltaAndCursorByBackspace({ composition, lines }, 1, 1)).toEqual({
        delta: [{ retain: 1 }, { delete: 1 }],
        cursor: 1,
      });
      expect(getDeltaAndCursorByBackspace({ composition, lines }, 1, 2)).toEqual({
        delta: [{ retain: 1 }, { delete: 2 }, { retain: 2 }, { retain: 1, attributes: { list: "bullet", indent: 1 } }],
        cursor: 1,
      });
      expect(getDeltaAndCursorByBackspace({ composition, lines }, 1, 3)).toEqual({
        delta: [{ retain: 1 }, { delete: 3 }, { retain: 1 }, { retain: 1, attributes: { list: "bullet", indent: 1 } }],
        cursor: 1,
      });
    });
  });
});

describe("getDeltaAndCursorByDelete", () => {
  const bounds = { x: 0, y: 0, width: 4, height: 10 };
  const composition = [
    { char: "a", bounds },
    { char: "b", bounds },
    { char: "😄", bounds },
    { char: "😄", bounds },
    { char: "c", bounds },
    { char: "d", bounds },
    { char: "\n", bounds },
  ];
  const docLength = composition.length;
  const nocontent = [{ char: "\n", bounds }];
  const empty: DocCompositionItem[] = [];

  test("should return delta and next cursor: no target", () => {
    expect(getDeltaAndCursorByDelete(empty, 0, 0, 0)).toEqual({
      delta: [],
      cursor: 0,
    });
    expect(getDeltaAndCursorByDelete(nocontent, 1, 0, 0)).toEqual({
      delta: [],
      cursor: 0,
    });
  });

  test("should return delta and next cursor", () => {
    expect(getDeltaAndCursorByDelete(composition, docLength, 0, 0)).toEqual({
      delta: [{ retain: 0 }, { delete: 1 }],
      cursor: 0,
    });
    expect(getDeltaAndCursorByDelete(composition, docLength, 1, 0)).toEqual({
      delta: [{ retain: 1 }, { delete: 1 }],
      cursor: 1,
    });
    expect(getDeltaAndCursorByDelete(composition, docLength, 5, 0)).toEqual({
      delta: [{ retain: 7 }, { delete: 1 }],
      cursor: 5,
    });
    expect(getDeltaAndCursorByDelete(composition, docLength, 6, 0)).toEqual({
      delta: [{ retain: 8 }, { delete: 0 }],
      cursor: 6,
    });
    expect(getDeltaAndCursorByDelete(composition, docLength, 1, 1)).toEqual({
      delta: [{ retain: 1 }, { delete: 1 }],
      cursor: 1,
    });
    expect(getDeltaAndCursorByDelete(composition, docLength, 0, 2)).toEqual({
      delta: [{ retain: 0 }, { delete: 2 }],
      cursor: 0,
    });
  });

  test("should return delta and next cursor: emoji", () => {
    expect(getDeltaAndCursorByDelete(composition, docLength, 2, 0)).toEqual({
      delta: [{ retain: 2 }, { delete: 2 }],
      cursor: 2,
    });
    expect(getDeltaAndCursorByDelete(composition, docLength, 3, 0)).toEqual({
      delta: [{ retain: 4 }, { delete: 2 }],
      cursor: 3,
    });
    expect(getDeltaAndCursorByDelete(composition, docLength, 2, 1)).toEqual({
      delta: [{ retain: 2 }, { delete: 2 }],
      cursor: 2,
    });
    expect(getDeltaAndCursorByDelete(composition, docLength, 2, 2)).toEqual({
      delta: [{ retain: 2 }, { delete: 4 }],
      cursor: 2,
    });
    expect(getDeltaAndCursorByDelete(composition, docLength, 1, 2)).toEqual({
      delta: [{ retain: 1 }, { delete: 3 }],
      cursor: 1,
    });
  });
});

describe("getLinkAt", () => {
  const linkAttrs0 = { link: "a" };
  const linkAttrs1 = { link: "b" };
  const bounds = { x: 0, y: 0, width: 4, height: 10 };

  test("should return inline link information at the point: link within a line", () => {
    const composition = [
      { char: "a", bounds },
      { char: "b", bounds: { ...bounds, x: 4 } },
      { char: "c", bounds: { ...bounds, x: 8 } },
      { char: "\n", bounds: { ...bounds, x: 12 } },
      { char: "d", bounds: { ...bounds, y: 10 } },
      { char: "\n", bounds: { ...bounds, x: 4, y: 10 } },
    ];
    const lines: DocCompositionLine[] = [
      {
        y: 0,
        height: 10,
        fontheight: 10,
        outputs: [
          { insert: "a" },
          { insert: "b", attributes: linkAttrs0 },
          { insert: "c", attributes: linkAttrs0 },
          { insert: "\n" },
        ],
      },
      {
        y: 10,
        height: 10,
        fontheight: 10,
        outputs: [{ insert: "d", attributes: linkAttrs0 }, { insert: "e" }, { insert: "\n" }],
      },
    ];

    expect(getLinkAt({ composition, lines }, { x: 3, y: 1 })).toEqual(undefined);
    expect(getLinkAt({ composition, lines }, { x: 5, y: 1 })).toEqual({
      link: "a",
      bounds: { x: 4, y: 0, width: 8, height: 10 },
      docRange: [1, 2],
    });
    expect(getLinkAt({ composition, lines }, { x: 1, y: 11 })).toEqual({
      link: "a",
      bounds: { x: 0, y: 10, width: 4, height: 10 },
      docRange: [4, 1],
    });
  });

  test("should return inline link information at the point: link over lines", () => {
    const composition = [
      { char: "a", bounds },
      { char: "b", bounds: { ...bounds, x: 4 } },
      { char: "c", bounds: { ...bounds, x: 8 } },
      { char: "d", bounds: { ...bounds, x: 0, y: 10 } },
      { char: "\n", bounds: { ...bounds, x: 4, y: 10 } },
    ];
    const lines: DocCompositionLine[] = [
      {
        y: 0,
        height: 10,
        fontheight: 10,
        outputs: [
          { insert: "a", attributes: linkAttrs1 },
          { insert: "b", attributes: linkAttrs0 },
          { insert: "c", attributes: linkAttrs0 },
        ],
      },
      {
        y: 10,
        height: 10,
        fontheight: 10,
        outputs: [{ insert: "d", attributes: linkAttrs0 }, { insert: "\n" }],
      },
    ];

    expect(getLinkAt({ composition, lines }, { x: 3, y: 1 })).toEqual({
      link: "b",
      bounds: { x: 0, y: 0, width: 4, height: 10 },
      docRange: [0, 1],
    });
    expect(getLinkAt({ composition, lines }, { x: 5, y: 1 })).toEqual({
      link: "a",
      bounds: { x: 0, y: 0, width: 12, height: 20 },
      docRange: [1, 3],
    });
    expect(getLinkAt({ composition, lines }, { x: 3, y: 11 })).toEqual({
      link: "a",
      bounds: { x: 0, y: 0, width: 12, height: 20 },
      docRange: [1, 3],
    });
    expect(getLinkAt({ composition, lines }, { x: 5, y: 11 })).toEqual(undefined);
  });
});

describe("getNextListIndent", () => {
  test("should increment the indent when the current line has list type and next type is quote", () => {
    expect(getNextListIndent({}, "bullet")).toBe(0);
    expect(getNextListIndent({}, "quote")).toBe(0);
    expect(getNextListIndent({ list: "bullet", indent: 1 }, "bullet")).toBe(1);
    expect(getNextListIndent({ list: "bullet", indent: 1 }, "quote")).toBe(2);
    expect(getNextListIndent({ list: "quote", indent: 1 }, "bullet")).toBe(1);
    expect(getNextListIndent({ list: "quote", indent: 1 }, "quote")).toBe(2);
  });
});

describe("createListIndexPath", () => {
  test("should return list index creator", () => {
    expect(createListIndexPath([], {})).toEqual([]);
    expect(createListIndexPath([["bullet", 0]], {})).toEqual([]);
    expect(createListIndexPath([], { list: "bullet", indent: 0 })).toEqual([["bullet", 0]]);

    // Skip level
    expect(createListIndexPath([], { list: "bullet", indent: 2 })).toEqual([
      ["bullet", 0],
      ["bullet", 0],
      ["bullet", 0],
    ]);

    // Same level
    expect(createListIndexPath([["bullet", 0]], { list: "bullet", indent: 0 })).toEqual([["bullet", 1]]);
    expect(createListIndexPath([["bullet", 0]], { list: "ordered", indent: 0 })).toEqual([["ordered", 1]]);

    // Deeper level
    expect(createListIndexPath([["bullet", 0]], { list: "bullet", indent: 1 })).toEqual([
      ["bullet", 0],
      ["bullet", 0],
    ]);
    expect(createListIndexPath([["bullet", 0]], { list: "ordered", indent: 1 })).toEqual([
      ["bullet", 0],
      ["ordered", 0],
    ]);
    expect(createListIndexPath([["bullet", 0]], { list: "bullet", indent: 2 })).toEqual([
      ["bullet", 0],
      ["bullet", 0],
      ["bullet", 0],
    ]);
    expect(createListIndexPath([["bullet", 0]], { list: "ordered", indent: 2 })).toEqual([
      ["bullet", 0],
      ["bullet", 0],
      ["ordered", 0],
    ]);

    // Shallower level
    expect(
      createListIndexPath(
        [
          ["bullet", 0],
          ["bullet", 0],
          ["bullet", 0],
        ],
        { list: "bullet", indent: 0 },
      ),
    ).toEqual([["bullet", 1]]);
    expect(
      createListIndexPath(
        [
          ["bullet", 0],
          ["bullet", 0],
          ["bullet", 0],
        ],
        { list: "bullet", indent: 1 },
      ),
    ).toEqual([
      ["bullet", 0],
      ["bullet", 1],
    ]);
    expect(
      createListIndexPath(
        [
          ["bullet", 0],
          ["bullet", 0],
          ["bullet", 0],
        ],
        { list: "ordered", indent: 0 },
      ),
    ).toEqual([["ordered", 1]]);
    expect(
      createListIndexPath(
        [
          ["bullet", 1],
          ["bullet", 0],
        ],
        { list: "ordered", indent: 0 },
      ),
    ).toEqual([["ordered", 2]]);
    expect(
      createListIndexPath(
        [
          ["bullet", 0],
          ["bullet", 0],
          ["bullet", 0],
        ],
        undefined,
      ),
    ).toEqual([]);
  });
});

describe("convertLineWordToComposition", () => {
  test("should align lines with regarding list style", () => {
    const res0 = convertLineWordToComposition(
      [
        [
          [
            [
              [
                [
                  ["a", 10],
                  ["b", 10],
                  ["\n", 0],
                ],
              ],
              { head: "-", padding: 30 },
            ],
          ],
          { list: "bullet", align: "center" },
        ],
        [
          [
            [
              [
                [
                  ["a", 10],
                  ["\n", 0],
                ],
              ],
              { head: "-", padding: 30 },
            ],
          ],
          { list: "bullet", align: "center" },
        ],
        [
          [
            [
              [
                [
                  ["a", 10],
                  ["\n", 0],
                ],
              ],
            ],
          ],
          { align: "center" },
        ],
        [
          [
            [
              [
                [
                  ["a", 10],
                  ["\n", 0],
                ],
              ],
              { head: "-", padding: 30 },
            ],
          ],
          { list: "bullet", align: "center" },
        ],
      ],
      100,
      100,
    );
    expect(res0.composition.map((c) => c.bounds.x)).toEqual([55, 65, 75, 55, 65, 45, 55, 60, 70]);
  });
});
