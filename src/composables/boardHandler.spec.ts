import { describe, test, expect } from "vitest";
import {
  getModifiedBoardRootIds,
  getNextBoardLayout,
  newBoardCardMovingHandler,
  newBoardHandler,
} from "./boardHandler";
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
const column1 = createShape<BoardColumnShape>(getCommonStruct, "board_column", {
  id: "column1",
  findex: generateKeyBetween(column0.findex, null),
  parentId: root.id,
});
const lane0 = createShape<BoardColumnShape>(getCommonStruct, "board_lane", {
  id: "lane0",
  findex: generateKeyBetween(column1.findex, null),
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
const card2 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
  id: "card2",
  findex: generateKeyBetween(card1.findex, null),
  parentId: root.id,
  columnId: column0.id,
  laneId: lane0.id,
});
const card3 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
  id: "card3",
  findex: generateKeyBetween(card2.findex, null),
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
    expect(result0["root"]).toEqual({ width: 380, height: 340 });
    expect(Object.keys(result0)).toHaveLength(5);
  });

  test("should do nothing when no root is found", () => {
    const shapeComposite = newShapeComposite({
      shapes: [column0, card0, lane0, card1],
      getStruct: getCommonStruct,
    });
    const result0 = getNextBoardLayout(shapeComposite, "root");
    expect(result0).toEqual({});
  });

  test("should do nothing when no column is found", () => {
    const shapeComposite = newShapeComposite({
      shapes: [root, card0, lane0],
      getStruct: getCommonStruct,
    });
    const result0 = getNextBoardLayout(shapeComposite, "root");
    expect(result0).toEqual({});
  });

  test("should not change a card when a parent column isn't found", () => {
    const shapeComposite = newShapeComposite({
      shapes: [root, column1, card0, lane0],
      getStruct: getCommonStruct,
    });
    const result0 = getNextBoardLayout(shapeComposite, "root");
    expect(Object.keys(result0).sort()).toEqual(["column1", "lane0", "root"]);
  });

  test("should return patch even when a lane isn't found", () => {
    const shapeComposite = newShapeComposite({
      shapes: [root, column0, card1],
      getStruct: getCommonStruct,
    });
    const result0 = getNextBoardLayout(shapeComposite, "root");
    expect(Object.keys(result0).sort()).toEqual(["card1", "column0", "root"]);
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

  test("should not return board roots when they are not found", () => {
    const shapeComposite = newShapeComposite({
      shapes: [column0, card0, lane0, card1],
      getStruct: getCommonStruct,
    });
    expect(getModifiedBoardRootIds(shapeComposite, {})).toEqual([]);
  });
});

describe("newBoardCardMovingHandler", () => {
  describe("hitTest", () => {
    const shapes = [root, column0, column1, card0, lane0, card1, card2, card3];
    const patch = getNextBoardLayout(
      newShapeComposite({
        shapes,
        getStruct: getCommonStruct,
      }),
      root.id,
    );
    const layoutShapes = shapes.map((s) => ({ ...s, ...patch[s.id] }));
    const shapeComposite = newShapeComposite({
      shapes: layoutShapes,
      getStruct: getCommonStruct,
    });
    const target = newBoardCardMovingHandler({
      getShapeComposite: () => shapeComposite,
      boardId: root.id,
      cardIds: [card0.id],
    });
    const layoutCard1 = shapeComposite.shapeMap[card1.id] as BoardCardShape;
    const layoutCard2 = shapeComposite.shapeMap[card2.id] as BoardCardShape;
    const layoutCard3 = shapeComposite.shapeMap[card3.id] as BoardCardShape;
    const layoutColumn1 = shapeComposite.shapeMap[column1.id] as BoardColumnShape;

    test("should return insertion information: to empty cell", () => {
      expect(target.hitTest(layoutColumn1.p)).toEqual({
        columnId: layoutColumn1.id,
        laneId: lane0.id,
        findex: generateKeyBetween(lane0.findex, null),
        rect: expect.anything(),
      });
    });

    test("should return insertion information: to between cards", () => {
      expect(target.hitTest(layoutCard2.p)).toEqual({
        columnId: card2.columnId,
        laneId: card2.laneId,
        findex: generateKeyBetween(card1.findex, card2.findex),
        rect: expect.anything(),
      });
      expect(target.hitTest({ x: layoutCard2.p.x, y: layoutCard2.p.y + layoutCard2.height })).toEqual({
        columnId: card2.columnId,
        laneId: card2.laneId,
        findex: generateKeyBetween(card2.findex, card3.findex),
        rect: expect.anything(),
      });
    });

    test("should return insertion information: to the top of the cell", () => {
      expect(target.hitTest(layoutCard1.p)).toEqual({
        columnId: card1.columnId,
        laneId: card1.laneId,
        findex: generateKeyBetween(null, card1.findex),
        rect: expect.anything(),
      });
    });

    test("should return insertion information: to the bottom of the cell", () => {
      expect(target.hitTest({ x: layoutCard3.p.x, y: layoutCard3.p.y + layoutCard3.height })).toEqual({
        columnId: card3.columnId,
        laneId: card3.laneId,
        findex: generateKeyBetween(card3.findex, null),
        rect: expect.anything(),
      });
    });

    test("should not return insertion information when the target is single card and the location is its neighbor", () => {
      const target0 = newBoardCardMovingHandler({
        getShapeComposite: () => shapeComposite,
        boardId: root.id,
        cardIds: [card2.id],
      });
      expect(target0.hitTest(layoutCard2.p)).toEqual(undefined);
      expect(target0.hitTest({ x: layoutCard2.p.x, y: layoutCard2.p.y + layoutCard2.height })).toEqual(undefined);

      const target1 = newBoardCardMovingHandler({
        getShapeComposite: () => shapeComposite,
        boardId: root.id,
        cardIds: [card2.id, card3.id],
      });
      expect(target1.hitTest(layoutCard2.p)).toEqual({
        columnId: card1.columnId,
        laneId: card1.laneId,
        findex: generateKeyBetween(card1.findex, card2.findex),
        rect: expect.anything(),
      });
    });
  });
});
