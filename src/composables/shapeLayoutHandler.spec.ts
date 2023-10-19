import { describe, test, expect } from "vitest";
import { getPatchInfoByLayouts } from "./shapeLayoutHandler";
import { createShape, getCommonStruct } from "../shapes";
import { generateKeyBetween } from "fractional-indexing";
import { BoardCardShape } from "../shapes/board/boardCard";
import { newShapeComposite } from "./shapeComposite";

describe("getPatchInfoByLayouts", () => {
  test("should delete when a shape can't exist under the updated condition", () => {
    const root = createShape(getCommonStruct, "board_root", {
      id: "root",
      findex: generateKeyBetween(null, null),
    });
    const column0 = createShape(getCommonStruct, "board_column", {
      id: "column0",
      findex: generateKeyBetween(root.findex, null),
      parentId: root.id,
    });
    const column1 = createShape(getCommonStruct, "board_column", {
      id: "column1",
      findex: generateKeyBetween(root.findex, null),
      parentId: root.id,
    });
    const lane0 = createShape(getCommonStruct, "board_lane", {
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
    const shapeComposite = newShapeComposite({
      shapes: [root, column0, column1, card0, lane0],
      getStruct: getCommonStruct,
    });

    const result0 = getPatchInfoByLayouts(shapeComposite, { delete: [column0.id] });
    expect(result0.delete).toEqual([column0.id, card0.id]);

    const result1 = getPatchInfoByLayouts(shapeComposite, { delete: [column1.id] });
    expect(result1.delete).toEqual([column1.id]);

    const result2 = getPatchInfoByLayouts(shapeComposite, { delete: [card0.id] });
    expect(result2.delete).toEqual([card0.id]);
  });
});
