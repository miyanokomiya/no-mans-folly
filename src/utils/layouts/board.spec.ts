import { describe, test, expect } from "vitest";
import { BoardLayoutCard, BoardLayoutCommon, getBoardRectMap } from "./board";
import { generateKeyBetween } from "fractional-indexing";

const offsetInfo = {
  boardPadding: 20,
  columnMargin: 30,
  columnPadding: 20,
  lanePadding: 10,
  cardMargin: 20,
};

describe("getBoardRectMap", () => {
  const rect = { x: 0, y: 0, width: 100, height: 50 };
  const columnWidth = 140;
  const root: BoardLayoutCommon = { id: "root", findex: generateKeyBetween(null, null), type: "root", rect } as const;
  const column0: BoardLayoutCommon = {
    id: "column0",
    findex: generateKeyBetween(root.findex, null),
    type: "column",
    rect: { ...rect, width: columnWidth },
  } as const;
  const card0: BoardLayoutCard = {
    id: "card0",
    findex: generateKeyBetween(column0.findex, null),
    type: "card",
    rect,
    columnId: column0.id,
  };
  const card1: BoardLayoutCard = {
    id: "card1",
    findex: generateKeyBetween(card0.findex, null),
    type: "card",
    rect,
    columnId: column0.id,
  };
  const column1: BoardLayoutCommon = {
    id: "column1",
    findex: generateKeyBetween(column0.findex, null),
    type: "column",
    rect: { ...rect, width: columnWidth },
  } as const;
  const card2: BoardLayoutCard = {
    id: "card2",
    findex: generateKeyBetween(column1.findex, null),
    type: "card",
    rect,
    columnId: column1.id,
  };
  const lane0: BoardLayoutCommon = {
    id: "lane0",
    findex: generateKeyBetween(root.findex, null),
    type: "lane",
    rect,
  } as const;
  const card3: BoardLayoutCard = {
    id: "card3",
    findex: generateKeyBetween(lane0.findex, null),
    type: "card",
    rect,
    columnId: column0.id,
    laneId: lane0.id,
  };
  const card4: BoardLayoutCard = {
    id: "card4",
    findex: generateKeyBetween(card3.findex, null),
    type: "card",
    rect,
    columnId: column1.id,
    laneId: lane0.id,
  };
  const card5: BoardLayoutCard = {
    id: "card5",
    findex: generateKeyBetween(card4.findex, null),
    type: "card",
    rect,
    columnId: column1.id,
    laneId: lane0.id,
  };
  const column2: BoardLayoutCommon = {
    id: "column2",
    findex: generateKeyBetween(column1.findex, null),
    type: "column",
    rect: { ...rect, width: columnWidth },
  } as const;

  test("should return calculated rectangles for all nodes: 0 column", () => {
    const cardMap = new Map<string, BoardLayoutCard>([]);
    const columnMap = new Map<string, BoardLayoutCommon>([]);
    const laneMap = new Map<string, BoardLayoutCommon>([]);
    const result = getBoardRectMap(root, cardMap, columnMap, laneMap, offsetInfo);
    expect(result[root.id]).toEqual({ x: 0, y: 0, width: 20, height: 20 });
  });

  test("should return calculated rectangles for all nodes: 1 column, 1 lane, 0 cards", () => {
    const cardMap = new Map<string, BoardLayoutCard>([]);
    const columnMap = new Map<string, BoardLayoutCommon>([["column0", column0]]);
    const laneMap = new Map<string, BoardLayoutCommon>([["lane0", lane0]]);
    const result = getBoardRectMap(root, cardMap, columnMap, laneMap, offsetInfo);
    expect(result[lane0.id]).toEqual({ x: 10, y: 40, width: 160, height: 20 });
    expect(result[root.id]).toEqual({ x: 0, y: 0, width: 180, height: 120 });
  });

  test("should return calculated rectangles for all nodes: 1 column, 0 lane", () => {
    const cardMap = new Map<string, BoardLayoutCard>([
      ["card0", card0],
      ["card1", card1],
    ]);
    const columnMap = new Map<string, BoardLayoutCommon>([["column0", column0]]);
    const laneMap = new Map<string, BoardLayoutCommon>([]);
    const result = getBoardRectMap(root, cardMap, columnMap, laneMap, offsetInfo);
    expect(result[column0.id]).toEqual({ x: 20, y: 20, width: 140, height: 160 });
    expect(result[card0.id]).toEqual({ x: 40, y: 40, width: 100, height: 50 });
    expect(result[card1.id]).toEqual({ x: 40, y: 110, width: 100, height: 50 });
    expect(result[root.id]).toEqual({ x: 0, y: 0, width: 180, height: 200 });
  });

  test("should return calculated rectangles for all nodes: 2 column, 0 lane", () => {
    const cardMap = new Map<string, BoardLayoutCard>([
      ["card0", card0],
      ["card1", card1],
      ["card2", card2],
    ]);
    const columnMap = new Map<string, BoardLayoutCommon>([
      ["column0", column0],
      ["column1", column1],
    ]);
    const laneMap = new Map<string, BoardLayoutCommon>([]);
    const result = getBoardRectMap(root, cardMap, columnMap, laneMap, offsetInfo);
    expect(result[column0.id]).toEqual({ x: 20, y: 20, width: 140, height: 160 });
    expect(result[card0.id]).toEqual({ x: 40, y: 40, width: 100, height: 50 });
    expect(result[card1.id]).toEqual({ x: 40, y: 110, width: 100, height: 50 });
    expect(result[column1.id]).toEqual({ x: 190, y: 20, width: 140, height: 160 });
    expect(result[card2.id]).toEqual({ x: 210, y: 40, width: 100, height: 50 });
    expect(result[root.id]).toEqual({ x: 0, y: 0, width: 350, height: 200 });
  });

  test("should return calculated rectangles for all nodes: 3 column, 0 lane", () => {
    const cardMap = new Map<string, BoardLayoutCard>([
      ["card0", card0],
      ["card1", card1],
      ["card2", card2],
    ]);
    const columnMap = new Map<string, BoardLayoutCommon>([
      ["column0", column0],
      ["column1", column1],
      ["column2", column2],
    ]);
    const laneMap = new Map<string, BoardLayoutCommon>([]);
    const result = getBoardRectMap(root, cardMap, columnMap, laneMap, offsetInfo);
    expect(result[column0.id]).toEqual({ x: 20, y: 20, width: 140, height: 160 });
    expect(result[card0.id]).toEqual({ x: 40, y: 40, width: 100, height: 50 });
    expect(result[card1.id]).toEqual({ x: 40, y: 110, width: 100, height: 50 });
    expect(result[column1.id]).toEqual({ x: 190, y: 20, width: 140, height: 160 });
    expect(result[card2.id]).toEqual({ x: 210, y: 40, width: 100, height: 50 });
    expect(result[column2.id]).toEqual({ x: 360, y: 20, width: 140, height: 160 });
    expect(result[root.id]).toEqual({ x: 0, y: 0, width: 520, height: 200 });
  });

  test("should return calculated rectangles for all nodes: 1 column, 1 lane", () => {
    const cardMap = new Map<string, BoardLayoutCard>([
      ["card0", card0],
      ["card3", card3],
    ]);
    const columnMap = new Map<string, BoardLayoutCommon>([["column0", column0]]);
    const laneMap = new Map<string, BoardLayoutCommon>([["lane0", lane0]]);
    const result = getBoardRectMap(root, cardMap, columnMap, laneMap, offsetInfo);
    expect(result[column0.id]).toEqual({ x: 20, y: 20, width: 140, height: 180 });
    expect(result[card3.id]).toEqual({ x: 40, y: 50, width: 100, height: 50 });
    expect(result[card0.id]).toEqual({ x: 40, y: 130, width: 100, height: 50 });
    expect(result[lane0.id]).toEqual({ x: 10, y: 40, width: 160, height: 70 });
    expect(result[root.id]).toEqual({ x: 0, y: 0, width: 180, height: 220 });
  });

  test("should return calculated rectangles for all nodes: 2 column, 1 lane", () => {
    const cardMap = new Map<string, BoardLayoutCard>([
      ["card0", card0],
      ["card3", card3],
      ["card4", card4],
      ["card5", card5],
    ]);
    const columnMap = new Map<string, BoardLayoutCommon>([
      ["column0", column0],
      ["column1", column1],
    ]);
    const laneMap = new Map<string, BoardLayoutCommon>([["lane0", lane0]]);
    const result = getBoardRectMap(root, cardMap, columnMap, laneMap, offsetInfo);
    expect(result[column0.id]).toEqual({ x: 20, y: 20, width: 140, height: 250 });
    expect(result[column1.id]).toEqual({ x: 190, y: 20, width: 140, height: 250 });
    expect(result[card3.id]).toEqual({ x: 40, y: 50, width: 100, height: 50 });
    expect(result[card4.id]).toEqual({ x: 210, y: 50, width: 100, height: 50 });
    expect(result[card5.id]).toEqual({ x: 210, y: 120, width: 100, height: 50 });
    expect(result[card0.id]).toEqual({ x: 40, y: 200, width: 100, height: 50 });
    expect(result[lane0.id]).toEqual({ x: 10, y: 40, width: 330, height: 140 });
    expect(result[root.id]).toEqual({ x: 0, y: 0, width: 350, height: 290 });
  });

  test("should resize cards to fit belonging lane", () => {
    const cardMap = new Map<string, BoardLayoutCard>([
      ["card0", card0],
      ["card2", card2],
    ]);
    const columnMap = new Map<string, BoardLayoutCommon>([
      ["column0", { ...column0, rect: { ...column0.rect, width: 200 } }],
      ["column1", { ...column1, rect: { ...column1.rect, width: 200 } }],
    ]);
    const laneMap = new Map<string, BoardLayoutCommon>([]);
    const result = getBoardRectMap(root, cardMap, columnMap, laneMap, offsetInfo);
    expect(result[card0.id]).toEqual({ x: 40, y: 40, width: 160, height: 50 });
    expect(result[card2.id]).toEqual({ x: 270, y: 40, width: 160, height: 50 });
    expect(result[root.id]).toEqual({ x: 0, y: 0, width: 470, height: 130 });
  });

  test("should layout based on root position", () => {
    const cardMap = new Map<string, BoardLayoutCard>([
      ["card0", card0],
      ["card1", card1],
    ]);
    const columnMap = new Map<string, BoardLayoutCommon>([["column0", column0]]);
    const laneMap = new Map<string, BoardLayoutCommon>([]);
    const result = getBoardRectMap(
      { ...root, rect: { ...root.rect, x: 10000, y: 20000 } },
      cardMap,
      columnMap,
      laneMap,
      offsetInfo,
    );
    expect(result[column0.id]).toEqual({ x: 10020, y: 20020, width: 140, height: 160 });
    expect(result[card0.id]).toEqual({ x: 10040, y: 20040, width: 100, height: 50 });
    expect(result[card1.id]).toEqual({ x: 10040, y: 20110, width: 100, height: 50 });
    expect(result[root.id]).toEqual({ x: 10000, y: 20000, width: 180, height: 200 });
  });
});
