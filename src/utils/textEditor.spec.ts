import { expect, describe, test } from "vitest";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LINEHEIGHT,
  DocCompositionItem,
  DocCompositionLine,
  applyAttrInfoToDocOutput,
  applyRangeWidthToLineWord,
  getCursorLocationAt,
  getDeltaByApplyBlockStyleToDoc,
  getDeltaByApplyDocStyle,
  getDeltaByApplyInlineStyleToDoc,
  getLineEndIndex,
  getLineHeadIndex,
  getLineHeight,
  getWordRangeAtCursor,
  isCursorInDoc,
  isLinebreak,
  mergeDocAttrInfo,
  sliceDocOutput,
  splitDocOutputByLineBreak,
  splitOutputsIntoLineWord,
} from "./textEditor";

describe("isLinebreak", () => {
  test("should return true when the character is line break", () => {
    expect(isLinebreak("\n")).toBe(true);
    expect(isLinebreak("\r\n")).toBe(true);
    expect(isLinebreak("a")).toBe(false);
    expect(isLinebreak(" ")).toBe(false);
    expect(isLinebreak("\t")).toBe(false);
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
      { y: 0, height: 10, fontheight: 10, outputs: [{ insert: "def\n" }] },
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
      { y: 0, height: 10, fontheight: 10, outputs: [{ insert: "def\n" }] },
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
      { y: 0, height: 10, fontheight: 10, outputs: [{ insert: "de\n" }] },
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
      { y: 0, height: 10, fontheight: 10, outputs: [{ insert: "def\n" }] },
    ];
    expect(isCursorInDoc(composition, compositionLines, { x: -1, y: -1 })).toBe(false);
    expect(isCursorInDoc(composition, compositionLines, { x: 1, y: -1 })).toBe(false);
    expect(isCursorInDoc(composition, compositionLines, { x: 3, y: -1 })).toBe(false);
    expect(isCursorInDoc(composition, compositionLines, { x: 0, y: 0 })).toBe(true);
    expect(isCursorInDoc(composition, compositionLines, { x: 3, y: 1 })).toBe(true);
    expect(isCursorInDoc(composition, compositionLines, { x: 3, y: 10 })).toBe(true);
    expect(isCursorInDoc(composition, compositionLines, { x: 3, y: 11 })).toBe(false);
    expect(isCursorInDoc(composition, compositionLines, { x: 16, y: 1 })).toBe(true);
    expect(isCursorInDoc(composition, compositionLines, { x: 17, y: 1 })).toBe(false);
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

describe("getDeltaByApplyInlineStyle", () => {
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

describe("mergeDocAttrInfo", () => {
  test("should return merge attribute info with certain priority", () => {
    expect(
      mergeDocAttrInfo({
        cursor: { size: 1, align: "left", direction: "top" },
        block: { size: 2, align: "center", direction: "middle" },
        doc: { size: 3, align: "right", direction: "bottom" },
      }),
    ).toEqual({ size: 1, align: "center", direction: "bottom" });
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
    expect(splitOutputsIntoLineWord([{ insert: "abここ\n", attributes: attrs0 }])).toEqual([
      [
        [
          ["a", 0, attrs0],
          ["b", 0, attrs0],
        ],
        [["こ", 0, attrs0]],
        [["こ", 0, attrs0]],
        [["\n", 0, attrs0]],
      ],
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
              ["a", 3],
              ["b", 3],
              ["c", 3],
            ],
          ],
          [
            [
              ["d", 3],
              ["e", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        { align: "right" },
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
          [[["a", 3]], [[" ", 3]]],
          [
            [
              ["c", 3],
              ["d", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        { align: "right" },
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
              ["a", 3],
              ["b", 3],
            ],
            [[" ", 3]],
          ],
          [
            [
              ["d", 1],
              ["e", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        { align: "right" },
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
              ["a", 3],
              ["b", 3],
            ],
          ],
          [[[" ", 7]]],
          [
            [
              ["d", 1],
              ["e", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        { align: "right" },
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
              ["a", 3],
              ["b", 3],
              ["c", 3],
            ],
          ],
          [
            [
              ["d", 3],
              ["e", 3],
              ["f", 3],
            ],
          ],
          [[["g", 3]], [["\n", 0, { align: "right" }]]],
        ],
        { align: "right" },
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
            [["\n", 0, { align: "right" }]],
          ],
        ],
        { align: "right" },
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
              ["a", 3],
              ["b", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        { align: "right" },
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
              ["a", 3],
              ["b", 3],
            ],
            [["\n", 0, { align: "right" }]],
          ],
        ],
        { align: "right" },
      ],
      [[[[["\n", 0, { align: "right" }]]]], { align: "right" }],
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
    expect(getWordRangeAtCursor(comp, 1)).toEqual([1, 0]);
    expect(getWordRangeAtCursor(comp, 2)).toEqual([2, 4]);
    expect(getWordRangeAtCursor(comp, 3)).toEqual([2, 4]);
    expect(getWordRangeAtCursor(comp, 4)).toEqual([2, 4]);
    expect(getWordRangeAtCursor(comp, 5)).toEqual([2, 4]);
    expect(getWordRangeAtCursor(comp, 6)).toEqual([6, 0]);

    const comp1 = [{ char: "a" }, { char: "\n" }, { char: "b" }, { char: "\n" }];
    expect(getWordRangeAtCursor(comp1, 0)).toEqual([0, 1]);
    expect(getWordRangeAtCursor(comp1, 1)).toEqual([1, 0]);
    expect(getWordRangeAtCursor(comp1, 2)).toEqual([2, 1]);
    expect(getWordRangeAtCursor(comp1, 3)).toEqual([3, 0]);
  });
});
