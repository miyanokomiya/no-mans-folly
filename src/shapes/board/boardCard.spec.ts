import { describe, test, expect } from "vitest";
import { struct } from "./boardCard";
import { newShapeComposite } from "../../composables/shapeComposite";
import { createShape, getCommonStruct } from "..";

describe("immigrateShapeIds", () => {
  test("should immigrate relations", () => {
    const card = struct.create({ parentId: "board", columnId: "column", laneId: "lane" });

    expect(struct.immigrateShapeIds?.(card, { column: "next_column", lane: "next_lane" }, true)).toEqual({
      columnId: "next_column",
      laneId: "next_lane",
    });
    expect(struct.immigrateShapeIds?.(card, { column: "next_column" }, true)).toEqual({
      columnId: "next_column",
    });
    expect(struct.immigrateShapeIds?.(card, { column: "next_column" }, true)).toHaveProperty("laneId");
  });

  test("should covert to rectangle shape when the column doesn't exist", () => {
    const card = struct.create({ parentId: "board", columnId: "column", laneId: "lane" });

    expect(struct.immigrateShapeIds?.(card, {}, true)).toEqual({
      type: "rectangle",
      columnId: undefined,
    });
    expect(struct.immigrateShapeIds?.(card, {})).toEqual({});
  });
});

describe("refreshRelation", () => {
  test("should covert to rectangle shape when the column doesn't exist", () => {
    const card = struct.create({ parentId: "board", columnId: "column", laneId: "lane" });

    expect(struct.refreshRelation?.(card, new Set())).toEqual({
      type: "rectangle",
      columnId: undefined,
      laneId: undefined,
    });
    expect(struct.refreshRelation?.(card, new Set(["column"]))).toEqual({
      laneId: undefined,
    });
    expect(struct.refreshRelation?.(card, new Set(["column"]))).toHaveProperty("laneId");
  });
});

describe("shouldDelete", () => {
  test("should return true when either the column or the board doesn't exist", () => {
    const board = createShape(getCommonStruct, "board_root", { id: "board" });
    const column = createShape(getCommonStruct, "board_column", { id: "column" });
    const card = struct.create({ parentId: board.id, columnId: column.id });

    expect(
      newShapeComposite({
        shapes: [card],
        getStruct: getCommonStruct,
      }).shouldDelete(card),
    ).toBe(true);
    expect(
      newShapeComposite({
        shapes: [board, card],
        getStruct: getCommonStruct,
      }).shouldDelete(card),
    ).toBe(true);
    expect(
      newShapeComposite({
        shapes: [column, card],
        getStruct: getCommonStruct,
      }).shouldDelete(card),
    ).toBe(true);
    expect(
      newShapeComposite({
        shapes: [board, column, card],
        getStruct: getCommonStruct,
      }).shouldDelete(card),
    ).toBe(false);
  });
});
