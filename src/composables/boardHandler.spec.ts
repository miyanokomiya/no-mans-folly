import { describe, test, expect } from "vitest";
import { getModifiedBoardRootIds, getNextBoardLayout, newBoardHandler } from "./boardHandler";
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
});
const lane0 = createShape<BoardColumnShape>(getCommonStruct, "board_lane", {
  id: "lane0",
  findex: generateKeyBetween(column0.findex, null),
  parentId: root.id,
});
const card0 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
  id: "card0",
  findex: generateKeyBetween(lane0.findex, null),
  parentId: root.id,
  columnId: column0.id,
});
const card1 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
  id: "card1",
  findex: generateKeyBetween(card0.findex, null),
  parentId: root.id,
  columnId: column0.id,
  laneId: lane0.id,
});
const shapeComposite = newShapeComposite({
  shapes: [root1, root, column0, card0, lane0, card1],
  getStruct: getCommonStruct,
});

describe("newBoardHandler", () => {
  describe("getCardsInColumnLane", () => {
    test("should return cards in a lane and a column", () => {
      const handler = newBoardHandler({ getShapeComposite: () => shapeComposite, boardId: root.id });
      expect(handler.getCardsInColumnLane(column0.id)).toEqual([card0]);
      expect(handler.getCardsInColumnLane(column0.id, lane0.id)).toEqual([card1]);
      expect(handler.getCardsInColumnLane("unknown")).toEqual([]);
    });
  });

  describe("generateNewColumnFindex", () => {
    test("should return findex for new column: no lane", () => {
      const shapeComposite = newShapeComposite({
        shapes: [root1, root, column0, card0],
        getStruct: getCommonStruct,
      });
      const handler = newBoardHandler({ getShapeComposite: () => shapeComposite, boardId: root.id });
      const result = handler.generateNewColumnFindex();
      expect(column0.findex < result).toBe(true);
      expect(result < card0.findex).toBe(true);
    });

    test("should return findex for new column: with a lane", () => {
      const handler = newBoardHandler({ getShapeComposite: () => shapeComposite, boardId: root.id });
      const result = handler.generateNewColumnFindex();
      expect(column0.findex < result).toBe(true);
      expect(result < lane0.findex).toBe(true);
    });
  });

  describe("generateNewLaneFindex", () => {
    test("should return findex for new lane: no lane", () => {
      const shapeComposite = newShapeComposite({
        shapes: [root1, root, column0, card0],
        getStruct: getCommonStruct,
      });
      const handler = newBoardHandler({ getShapeComposite: () => shapeComposite, boardId: root.id });
      const result = handler.generateNewLaneFindex();
      expect(column0.findex < result).toBe(true);
      expect(result < card0.findex).toBe(true);
    });

    test("should return findex for new column: with a lane", () => {
      const handler = newBoardHandler({ getShapeComposite: () => shapeComposite, boardId: root.id });
      const result = handler.generateNewLaneFindex();
      expect(lane0.findex < result).toBe(true);
      expect(result < card0.findex).toBe(true);
    });
  });

  describe("isBoardChanged", () => {
    test("should return true when the ids belong to the board", () => {
      const handler = newBoardHandler({ getShapeComposite: () => shapeComposite, boardId: root.id });
      expect(handler.isBoardChanged([])).toBe(false);
      expect(handler.isBoardChanged(["unknown"])).toBe(false);
      expect(handler.isBoardChanged([root.id])).toBe(true);
      expect(handler.isBoardChanged([column0.id])).toBe(true);
      expect(handler.isBoardChanged([card0.id])).toBe(true);
      expect(handler.isBoardChanged(["unknown", column0.id])).toBe(true);
    });
  });
});

describe("getNextBoardLayout", () => {
  test("should return patch object to recalculate the board layout", () => {
    const result0 = getNextBoardLayout(shapeComposite, "root");
    expect(result0["root"]).toEqual({ width: 380, height: 240 });
    expect(Object.keys(result0)).toHaveLength(5);
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
