import { describe, test, expect } from "vitest";
import {
  getModifiedBoardRootIds,
  getNextBoardLayout,
  newBoardCardMovingHandler,
  newBoardColumnMovingHandler,
  newBoardHandler,
  newBoardLaneMovingHandler,
} from "./boardHandler";
import { createShape, getCommonStruct } from "../shapes";
import { BoardRootShape } from "../shapes/board/boardRoot";
import { BoardColumnShape } from "../shapes/board/boardColumn";
import { BoardCardShape } from "../shapes/board/boardCard";
import { getNextShapeComposite, newShapeComposite } from "./shapeComposite";
import { BoardLaneShape } from "../shapes/board/boardLane";
import { add } from "okageo";
import { generateKeyBetween } from "../utils/findex";

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
  findex: generateKeyBetween("a0", "a1"),
  parentId: root.id,
});
const column1 = createShape<BoardColumnShape>(getCommonStruct, "board_column", {
  id: "column1",
  findex: generateKeyBetween(column0.findex, "a1"),
  parentId: root.id,
});
const column2 = createShape<BoardColumnShape>(getCommonStruct, "board_column", {
  id: "column2",
  findex: generateKeyBetween(column1.findex, "a1"),
  parentId: root.id,
});
const column3 = createShape<BoardColumnShape>(getCommonStruct, "board_column", {
  id: "column3",
  findex: generateKeyBetween(column2.findex, "a1"),
  parentId: root.id,
});
const column4 = createShape<BoardColumnShape>(getCommonStruct, "board_column", {
  id: "column4",
  findex: generateKeyBetween("a0", "a1"),
  parentId: root1.id,
});
const lane0 = createShape<BoardColumnShape>(getCommonStruct, "board_lane", {
  id: "lane0",
  findex: generateKeyBetween("a1", "a2"),
  parentId: root.id,
});
const lane1 = createShape<BoardColumnShape>(getCommonStruct, "board_lane", {
  id: "lane1",
  findex: generateKeyBetween(lane0.findex, "a2"),
  parentId: root.id,
});
const lane2 = createShape<BoardColumnShape>(getCommonStruct, "board_lane", {
  id: "lane2",
  findex: generateKeyBetween(lane1.findex, "a2"),
  parentId: root.id,
});
const lane3 = createShape<BoardColumnShape>(getCommonStruct, "board_lane", {
  id: "lane3",
  findex: generateKeyBetween(lane2.findex, "a2"),
  parentId: root.id,
});
const card0 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
  id: "card0",
  findex: generateKeyBetween("a2", "a3"),
  parentId: root.id,
  columnId: column0.id,
});
const card1 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
  id: "card1",
  findex: generateKeyBetween(card0.findex, "a3"),
  parentId: root.id,
  columnId: column0.id,
  laneId: lane0.id,
});
const card2 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
  id: "card2",
  findex: generateKeyBetween(card1.findex, "a3"),
  parentId: root.id,
  columnId: column0.id,
  laneId: lane0.id,
});
const card3 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
  id: "card3",
  findex: generateKeyBetween(card2.findex, "a3"),
  parentId: root.id,
  columnId: column0.id,
  laneId: lane0.id,
});
const shapeComposite = newShapeComposite({
  shapes: [root1, column4, root, column0, card0, lane0, card1],
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

  describe("hitTest", () => {
    const root = createShape<BoardRootShape>(getCommonStruct, "board_root", {
      id: "root",
      findex: generateKeyBetween(null, null),
      width: 120,
      height: 70,
    });
    const column0 = createShape<BoardColumnShape>(getCommonStruct, "board_column", {
      id: "column0",
      findex: generateKeyBetween("a0", "a1"),
      parentId: root.id,
      p: { x: 10, y: 10 },
      width: 100,
      height: 50,
    });

    test("should return hit result for anchors: rotated", () => {
      const shapeComposite = newShapeComposite({
        shapes: [root, column0],
        getStruct: getCommonStruct,
      });
      const handler = newBoardHandler({ getShapeComposite: () => shapeComposite, boardId: root.id });
      expect(handler.hitTest({ x: 120, y: 60 })).toEqual({
        type: "add_column",
        p: { x: 120, y: 60 },
      });
      expect(handler.hitTest({ x: 60, y: 60 })).toEqual({
        type: "add_card",
        p: { x: 60, y: 60 },
        columnId: "column0",
        laneId: "",
      });
    });

    test("should return hit result for anchors: rotated", () => {
      const shapeComposite = newShapeComposite({
        shapes: [root, column0].map((s) => ({ ...s, rotation: Math.PI / 2 })),
        getStruct: getCommonStruct,
      });
      const handler = newBoardHandler({ getShapeComposite: () => shapeComposite, boardId: root.id });
      expect(handler.hitTest({ x: 35, y: 95 })).toEqual({
        type: "add_column",
        p: { x: 120, y: 60 },
      });
      expect(handler.hitTest({ x: 35, y: 35 })).toEqual({
        type: "add_card",
        p: { x: 60, y: 60 },
        columnId: "column0",
        laneId: "",
      });
    });
  });
});

describe("getNextBoardLayout", () => {
  test("should return patch object to recalculate the board layout", () => {
    const result0 = getNextBoardLayout(shapeComposite, "root");
    expect(result0["root"]).toHaveProperty("width");
    expect(result0["root"]).toHaveProperty("height");
    expect(Object.keys(result0)).toHaveLength(5);
  });

  test("should be based on rotation of the board", () => {
    const shapeComposite = newShapeComposite({
      shapes: [{ ...root, rotation: Math.PI / 2 }, column0, card0, lane0, card1, card2],
      getStruct: getCommonStruct,
    });
    const result0 = getNextBoardLayout(shapeComposite, "root");
    expect(result0["root"].rotation).toBe(undefined);
    expect(result0["column0"].rotation).toBe(Math.PI / 2);
    expect(result0["column0"]).not.toHaveProperty("width");
    expect(result0["lane0"].rotation).toBe(Math.PI / 2);
    expect(result0["card0"].rotation).toBe(Math.PI / 2);
    expect(result0["card1"].rotation).toBe(Math.PI / 2);
    expect(result0["card1"].p!.x).toBeGreaterThan(result0["card2"].p!.x);
    expect(result0["card1"].p!.y).toBeCloseTo(result0["card2"].p!.y);
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
    expect(getModifiedBoardRootIds(shapeComposite, shapeComposite, {})).toEqual([]);
    expect(getModifiedBoardRootIds(shapeComposite, shapeComposite, { update: { root: {} } })).toEqual(["root"]);
    expect(getModifiedBoardRootIds(shapeComposite, shapeComposite, { update: { column0: {} } })).toEqual(["root"]);
    expect(getModifiedBoardRootIds(shapeComposite, shapeComposite, { update: { card0: {} } })).toEqual(["root"]);
    expect(
      getModifiedBoardRootIds(shapeComposite, shapeComposite, { update: { card0: {} }, delete: ["root"] }),
    ).toEqual([]);
  });

  test("should return both board roots when a card move to other board", () => {
    const patchInfo = { update: { card0: { parentId: root1.id, columnId: column4.id } } };
    expect(
      getModifiedBoardRootIds(shapeComposite, getNextShapeComposite(shapeComposite, patchInfo), patchInfo),
    ).toEqual(["root", "root1"]);
  });

  test("should return the original board root when a card is disconnected", () => {
    const patchInfo = { update: { card0: { parentId: undefined, columnId: undefined } } };
    expect(
      getModifiedBoardRootIds(shapeComposite, getNextShapeComposite(shapeComposite, patchInfo), patchInfo),
    ).toEqual(["root"]);
  });

  test("should not return board roots when they are not found", () => {
    const shapeComposite = newShapeComposite({
      shapes: [column0, card0, lane0, card1],
      getStruct: getCommonStruct,
    });
    expect(getModifiedBoardRootIds(shapeComposite, shapeComposite, {})).toEqual([]);
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
        findexBetween: ["a2", "a3"],
        rect: expect.anything(),
      });
      expect(target.hitTest(add(layoutColumn1.p, { x: 0, y: layoutColumn1.height }))).toEqual({
        columnId: layoutColumn1.id,
        laneId: "",
        findexBetween: ["a2", "a3"],
        rect: expect.anything(),
      });
    });

    test("should return insertion information: to between cards", () => {
      expect(target.hitTest(layoutCard2.p)).toEqual({
        columnId: card2.columnId,
        laneId: card2.laneId,
        findexBetween: [card1.findex, card2.findex],
        rect: expect.anything(),
      });
      expect(target.hitTest({ x: layoutCard2.p.x, y: layoutCard2.p.y + layoutCard2.height })).toEqual({
        columnId: card2.columnId,
        laneId: card2.laneId,
        findexBetween: [card2.findex, card3.findex],
        rect: expect.anything(),
      });
    });

    test("should return insertion information: to the top of the cell", () => {
      expect(target.hitTest(layoutCard1.p)).toEqual({
        columnId: card1.columnId,
        laneId: card1.laneId,
        findexBetween: ["a2", card1.findex],
        rect: expect.anything(),
      });
    });

    test("should return insertion information: to the bottom of the cell", () => {
      expect(target.hitTest({ x: layoutCard3.p.x, y: layoutCard3.p.y + layoutCard3.height })).toEqual({
        columnId: card3.columnId,
        laneId: card3.laneId,
        findexBetween: [card3.findex, "a3"],
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
        findexBetween: [card1.findex, card2.findex],
        rect: expect.anything(),
      });
    });

    test("should be able to insert a board without any cards", () => {
      const shapes = [root, column0, lane0];
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
      const layoutColumn0 = shapeComposite.shapeMap[column0.id] as BoardColumnShape;

      expect(target.hitTest(layoutColumn0.p)).toEqual({
        columnId: layoutColumn0.id,
        laneId: lane0.id,
        findexBetween: ["a2", "a3"],
        rect: expect.anything(),
      });
      expect(target.hitTest(add(layoutColumn0.p, { x: 0, y: layoutColumn0.height }))).toEqual({
        columnId: layoutColumn0.id,
        laneId: "",
        findexBetween: ["a2", "a3"],
        rect: expect.anything(),
      });
    });

    test("should return insertion information: rotated board", () => {
      const shapes = [{ ...root, rotation: Math.PI / 2 }, column0, column1, card0, lane0, card1, card2, card3];
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
      expect(target.hitTest({ x: layoutCard3.p.x, y: layoutCard3.p.y + layoutCard3.height })).toEqual({
        columnId: column1.id,
        laneId: card3.laneId,
        findexBetween: ["a2", "a3"],
        rect: expect.anything(),
      });
    });
  });
});

describe("newBoardColumnMovingHandler", () => {
  describe("hitTest", () => {
    const shapes = [root, column0, column1, column2, column3, card0, lane0];
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
    const target = newBoardColumnMovingHandler({
      getShapeComposite: () => shapeComposite,
      boardId: root.id,
      columnIds: [column1.id],
    });
    const layoutColumn0 = shapeComposite.shapeMap[column0.id] as BoardColumnShape;
    const layoutColumn2 = shapeComposite.shapeMap[column2.id] as BoardColumnShape;
    const layoutColumn3 = shapeComposite.shapeMap[column3.id] as BoardColumnShape;

    test("should return insertion information: to between columns", () => {
      expect(target.hitTest(layoutColumn3.p)).toEqual({
        findexBetween: [layoutColumn2.findex, layoutColumn3.findex],
        rect: expect.anything(),
      });
    });

    test("should return insertion information: to the first", () => {
      expect(target.hitTest(layoutColumn0.p)).toEqual({
        findexBetween: [root.findex, column0.findex],
        rect: expect.anything(),
      });
    });

    test("should return insertion information: to the last", () => {
      expect(target.hitTest({ x: layoutColumn3.p.x + layoutColumn3.width, y: layoutColumn3.p.y })).toEqual({
        findexBetween: [column3.findex, "a1"],
        rect: expect.anything(),
      });
    });

    test("should not return insertion information when the target is single card and the location is its neighbor", () => {
      const target0 = newBoardColumnMovingHandler({
        getShapeComposite: () => shapeComposite,
        boardId: root.id,
        columnIds: [column1.id],
      });
      expect(target0.hitTest(layoutColumn2.p)).toEqual(undefined);
      expect(target0.hitTest({ x: layoutColumn0.p.x + layoutColumn0.width, y: layoutColumn0.p.y })).toEqual(undefined);

      const target1 = newBoardColumnMovingHandler({
        getShapeComposite: () => shapeComposite,
        boardId: root.id,
        columnIds: [column1.id, column2.id],
      });
      expect(target1.hitTest(layoutColumn3.p)).toEqual({
        findexBetween: [column2.findex, column3.findex],
        rect: expect.anything(),
      });
    });
  });
});

describe("newBoardLaneMovingHandler", () => {
  describe("hitTest", () => {
    const shapes = [root, column0, card0, lane0, lane1, lane2, lane3];
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
    const target = newBoardLaneMovingHandler({
      getShapeComposite: () => shapeComposite,
      boardId: root.id,
      laneIds: [lane1.id],
    });
    const layoutLane0 = shapeComposite.shapeMap[lane0.id] as BoardLaneShape;
    const layoutLane2 = shapeComposite.shapeMap[lane2.id] as BoardLaneShape;
    const layoutLane3 = shapeComposite.shapeMap[lane3.id] as BoardLaneShape;

    test("should return insertion information: to between columns", () => {
      expect(target.hitTest(layoutLane3.p)).toEqual({
        findexBetween: [layoutLane2.findex, layoutLane3.findex],
        rect: expect.anything(),
      });
    });

    test("should return insertion information: to the first", () => {
      expect(target.hitTest(layoutLane0.p)).toEqual({
        findexBetween: ["a1", lane0.findex],
        rect: expect.anything(),
      });
    });

    test("should return insertion information: to the last", () => {
      expect(target.hitTest({ x: layoutLane3.p.x, y: layoutLane3.p.y + layoutLane3.height })).toEqual({
        findexBetween: [lane3.findex, "a2"],
        rect: expect.anything(),
      });
    });

    test("should not return insertion information when the target is single card and the location is its neighbor", () => {
      const target0 = newBoardLaneMovingHandler({
        getShapeComposite: () => shapeComposite,
        boardId: root.id,
        laneIds: [lane1.id],
      });
      expect(target0.hitTest(layoutLane2.p)).toEqual(undefined);
      expect(target0.hitTest({ x: layoutLane0.p.x, y: layoutLane0.p.y + layoutLane0.height })).toEqual(undefined);

      const target1 = newBoardLaneMovingHandler({
        getShapeComposite: () => shapeComposite,
        boardId: root.id,
        laneIds: [lane1.id, lane2.id],
      });
      expect(target1.hitTest(layoutLane3.p)).toEqual({
        findexBetween: [lane2.findex, lane3.findex],
        rect: expect.anything(),
      });
    });
  });
});
