import { describe, test, expect } from "vitest";
import { getModifiedBoardRootIds, getNextBoardLayout } from "./boardHandler";
import { createShape, getCommonStruct } from "../shapes";
import { BoardRootShape } from "../shapes/board/boardRoot";
import { generateKeyBetween } from "fractional-indexing";
import { BoardColumnShape } from "../shapes/board/boardColumn";
import { BoardCardShape } from "../shapes/board/boardCard";
import { newShapeComposite } from "./shapeComposite";

const root = createShape<BoardRootShape>(getCommonStruct, "board_root", {
  id: "root",
  findex: generateKeyBetween(null, null),
  p: { x: 0, y: 0 },
  width: 10,
  height: 10,
});
const root1 = createShape<BoardRootShape>(getCommonStruct, "board_root", {
  id: "root1",
  findex: generateKeyBetween(null, null),
  p: { x: 0, y: 0 },
  width: 10,
  height: 10,
});
const column0 = createShape<BoardColumnShape>(getCommonStruct, "board_column", {
  id: "column0",
  findex: generateKeyBetween(root.findex, null),
  parentId: root.id,
  p: { x: 50, y: -50 },
});
const card0 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
  id: "card0",
  findex: generateKeyBetween(column0.findex, null),
  parentId: root.id,
  columnId: column0.id,
});
const shapeComposite = newShapeComposite({
  shapes: [root1, root, column0, card0],
  getStruct: getCommonStruct,
});

describe("getNextBoardLayout", () => {
  test("should return patch object to recalculate the board layout", () => {
    const result0 = getNextBoardLayout(shapeComposite, "root");
    expect(result0["root"]).toEqual({ width: 380, height: 140 });
    expect(Object.keys(result0)).toHaveLength(3);
  });
});

describe("getModifiedBoardRootIds", () => {
  test("should return board roots related to modified shapes", () => {
    expect(getModifiedBoardRootIds(shapeComposite, {})).toEqual([]);
    expect(getModifiedBoardRootIds(shapeComposite, { update: { root: {} } })).toEqual(["root"]);
    expect(getModifiedBoardRootIds(shapeComposite, { update: { column0: {} } })).toEqual(["root"]);
    expect(getModifiedBoardRootIds(shapeComposite, { update: { card0: {} } })).toEqual(["root"]);
    expect(getModifiedBoardRootIds(shapeComposite, { update: { card0: {} }, delete: ["root"] })).toEqual([]);
  });
});
