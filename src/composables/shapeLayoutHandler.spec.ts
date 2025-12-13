import { describe, test, expect } from "vitest";
import {
  getEntityPatchByDelete,
  getPatchAfterLayouts,
  getPatchByLayouts,
  getPatchInfoByLayouts,
} from "./shapeLayoutHandler";
import { createShape, getCommonStruct } from "../shapes";
import { BoardCardShape } from "../shapes/board/boardCard";
import { newShapeComposite } from "./shapeComposite";
import { generateKeyBetween } from "../utils/findex";
import { LineShape } from "../shapes/line";

describe("getEntityPatchByDelete", () => {
  test("should return entity patch to delete child shapes", () => {
    const root = createShape(getCommonStruct, "board_root", {
      id: "root",
      findex: generateKeyBetween(null, null),
    });
    const column0 = createShape(getCommonStruct, "board_column", {
      id: "column0",
      findex: generateKeyBetween(root.findex, null),
      parentId: root.id,
    });
    const shapeComposite = newShapeComposite({
      shapes: [root, column0],
      getStruct: getCommonStruct,
    });
    const result = getEntityPatchByDelete(shapeComposite, [root.id]);
    expect(result.delete).toEqual([root.id, column0.id]);
  });

  test("should return entity patch to clear relations to deleted shapes", () => {
    const rectangle = createShape(getCommonStruct, "rectangle", {
      id: "rectangle",
    });
    const line = createShape<LineShape>(getCommonStruct, "line", {
      id: "line",
      pConnection: { id: rectangle.id, rate: { x: 0, y: 0 } },
    });
    const shapeComposite = newShapeComposite({
      shapes: [rectangle, line],
      getStruct: getCommonStruct,
    });
    const result = getEntityPatchByDelete(shapeComposite, [rectangle.id]);
    expect(result.delete).toEqual([rectangle.id]);
    expect(result.update).toStrictEqual({
      [line.id]: { pConnection: undefined },
    });
  });

  test("should delete update when it's deleted", () => {
    const rectangle = createShape(getCommonStruct, "rectangle", {
      id: "rectangle",
    });
    const line = createShape(getCommonStruct, "line", {
      id: "line",
    });
    const shapeComposite = newShapeComposite({
      shapes: [rectangle, line],
      getStruct: getCommonStruct,
    });
    const result = getEntityPatchByDelete(shapeComposite, [rectangle.id], { [rectangle.id]: { findex: "aA" } });
    expect(result.delete).toEqual([rectangle.id]);
    expect(result.update).toStrictEqual({});
  });
});

describe("getPatchByLayouts", () => {
  test("error case: regard new shapes added by the patch", () => {
    const root = createShape(getCommonStruct, "board_root", {
      id: "root",
      findex: generateKeyBetween(null, null),
    });
    const column0 = createShape(getCommonStruct, "board_column", {
      id: "column0",
      findex: generateKeyBetween(root.findex, null),
      parentId: root.id,
    });
    const shapeComposite = newShapeComposite({
      shapes: [root, column0],
      getStruct: getCommonStruct,
    });

    const new_card = createShape<BoardCardShape>(getCommonStruct, "board_card", {
      id: "new_card",
      findex: generateKeyBetween(column0.findex, null),
      parentId: root.id,
      columnId: column0.id,
    });
    const result = getPatchByLayouts(shapeComposite, { add: [new_card] });
    expect(result[new_card.id]).toHaveProperty("p");
  });
});

describe("getPatchInfoByLayouts", () => {
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

  test("should delete when a shape can't exist under the updated condition", () => {
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

  test("should delete update when it's deleted", () => {
    const shapeComposite = newShapeComposite({
      shapes: [root, column0, card0],
      getStruct: getCommonStruct,
    });

    const result0 = getPatchInfoByLayouts(shapeComposite, {
      add: [lane0],
      delete: [card0.id, lane0.id],
      update: {
        [card0.id]: { findex: "Zz" },
      },
    });
    expect(result0.add).toEqual([]);
    expect(result0.delete).toEqual([card0.id, lane0.id]);
    expect(result0.update).not.toHaveProperty(card0.id);
  });

  test("should apply layout to newly added shapes", () => {
    const rect1 = createShape(getCommonStruct, "rectangle", {
      id: "rect1",
    });
    const line1 = createShape<LineShape>(getCommonStruct, "line", {
      id: "line1",
      qConnection: { id: rect1.id, rate: { x: 0.5, y: 0.5 } },
    });
    const shapeComposite = newShapeComposite({
      shapes: [rect1],
      getStruct: getCommonStruct,
    });

    const result0 = getPatchInfoByLayouts(shapeComposite, { add: [line1] });
    expect(result0.add).toEqual([{ ...line1, q: { x: 50, y: 50 } }]);
  });

  test("should apply line related layouts", () => {
    const rect1 = createShape(getCommonStruct, "rectangle", {
      id: "rect1",
    });
    const rect2 = createShape(getCommonStruct, "rectangle", {
      id: "rect2",
      p: { x: 100, y: 200 },
      attachment: {
        id: rect1.id,
        to: { x: 0.5, y: 0.5 },
        anchor: { x: 0.5, y: 0.5 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const shapeComposite = newShapeComposite({
      shapes: [rect1, rect2],
      getStruct: getCommonStruct,
    });

    const result0 = getPatchInfoByLayouts(shapeComposite, { update: { [rect1.id]: { p: { x: 10, y: 20 } } } });
    expect(result0.update).toEqual({
      [rect1.id]: { p: { x: 10, y: 20 } },
      [rect2.id]: { p: { x: 110, y: 220 } },
    });
  });
});

describe("getPatchAfterLayouts", () => {
  test("error case: regard new shapes added by the patch", () => {
    const root = createShape(getCommonStruct, "board_root", {
      id: "root",
      findex: generateKeyBetween(null, null),
    });
    const column0 = createShape(getCommonStruct, "board_column", {
      id: "column0",
      findex: generateKeyBetween(root.findex, null),
      parentId: root.id,
    });
    const shapeComposite = newShapeComposite({
      shapes: [root, column0],
      getStruct: getCommonStruct,
    });

    const new_card = createShape<BoardCardShape>(getCommonStruct, "board_card", {
      id: "new_card",
      findex: generateKeyBetween(column0.findex, null),
      parentId: root.id,
      columnId: column0.id,
    });
    const result = getPatchAfterLayouts(shapeComposite, { add: [new_card] });
    expect(result[new_card.id]).toBe(undefined);
  });
});
