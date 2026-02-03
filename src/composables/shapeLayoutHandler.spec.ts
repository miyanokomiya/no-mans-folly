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
import { generateKeyBetween, generateNKeysBetween } from "../utils/findex";
import { LineShape } from "../shapes/line";
import { TextShape } from "../shapes/text";
import { RectangleShape } from "../shapes/rectangle";
import { TableShape } from "../shapes/table/table";
import { AlignBoxShape } from "../shapes/align/alignBox";

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

  test("practical case: Preserve connection with line label", () => {
    const shape = createShape(getCommonStruct, "rectangle", {
      id: "shape",
    });
    const line = createShape<LineShape>(getCommonStruct, "line", {
      id: "line",
      p: { x: -100, y: 0 },
      q: { x: 100, y: 50 },
      qConnection: { id: shape.id, rate: { x: 0, y: 0.5 } },
    });
    const label = createShape<TextShape>(getCommonStruct, "text", {
      id: "text",
      p: { x: -55, y: 18 },
      lineAttached: 0.5,
      parentId: line.id,
      vAlign: "center",
      hAlign: "center",
    });
    const labelAttached = createShape(getCommonStruct, "rectangle", {
      id: "labelAttached",
      attachment: {
        id: label.id,
        to: { x: 0.5, y: 0.5 },
        anchor: { x: 0.5, y: 0.5 },
        rotationType: "absolute",
        rotation: 0,
      },
    });
    const shapeComposite = newShapeComposite({
      shapes: [shape, line, label, labelAttached],
      getStruct: getCommonStruct,
    });
    const result = getPatchByLayouts(shapeComposite, {
      update: {
        [shape.id]: { height: 200 } as Partial<RectangleShape>,
        [line.id]: { qConnection: { id: shape.id, rate: { x: 0, y: 0.25 } } } as Partial<LineShape>,
        [label.id]: { findex: "aA" },
      },
    });
    expect(result, "the label and its dep don't change").toEqual({
      [shape.id]: { height: 200 },
      [line.id]: { q: { x: 0, y: 50 }, qConnection: { id: shape.id, rate: { x: 0, y: 0.25 } } },
      [label.id]: { findex: "aA" },
      [labelAttached.id]: {},
    });
  });

  test.only("practical case: Layered bidirectional layout shapes", () => {
    const findexList = generateNKeysBetween(null, null, 10);
    const parentTable = createShape<TableShape>(getCommonStruct, "table", {
      id: "parentTable",
      findex: findexList[0],
    });
    parentTable.c_0!.fit = true;
    parentTable.c_0!.size = 60;
    parentTable.r_0!.size = 60;
    parentTable.r_1!.size = 60;
    delete parentTable.r_2;
    delete parentTable.c_2;

    const childTable = createShape<TableShape>(getCommonStruct, "table", {
      id: "childTable",
      findex: findexList[1],
      parentId: parentTable.id,
      parentMeta: "r_1:c_0",
      lcH: 1,
      lcV: 1,
    });
    childTable.c_0!.fit = true;
    childTable.c_0!.size = 30;
    childTable.c_1!.size = 30;
    childTable.r_0!.size = 20;
    childTable.r_1!.size = 20;
    delete childTable.r_2;
    delete childTable.c_2;

    const grandChildAlign = createShape<AlignBoxShape>(getCommonStruct, "align_box", {
      id: "grandChildAlign",
      findex: findexList[2],
      parentId: childTable.id,
      parentMeta: "r_0:c_0",
      lcH: 1,
      width: 30,
      height: 10,
    });
    const rect0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "rect0",
      findex: findexList[3],
      parentId: grandChildAlign.id,
      width: 10,
      height: 10,
    });
    const rect1 = { ...rect0, id: "rect1", findex: findexList[4] };
    const rect2 = { ...rect0, id: "rect2", findex: findexList[5] };
    const shapeComposite = newShapeComposite({
      shapes: [parentTable, childTable, grandChildAlign, rect0, rect1, rect2],
      getStruct: getCommonStruct,
    });
    const result = getPatchByLayouts(shapeComposite, {
      update: {
        [parentTable.id]: { c_0: { ...parentTable.c_0!, size: 120 } } as Partial<TableShape>,
      },
    });
    expect(result).toEqual({
      parentTable: {
        c_0: {
          id: "c_0",
          findex: "a0",
          fit: true,
          size: 120,
        },
      },
      childTable: {
        p: {
          x: 0,
          y: 60,
        },
        c_0: {
          id: "c_0",
          findex: "a0",
          fit: true,
          size: 60,
        },
        c_1: {
          id: "c_1",
          findex: "a1",
          size: 60,
        },
        r_0: {
          id: "r_0",
          findex: "a3",
          size: 30,
        },
        r_1: {
          id: "r_1",
          findex: "a4",
          size: 30,
        },
      },
      grandChildAlign: {
        p: {
          x: 0,
          y: 70,
        },
        width: 60,
        baseWidth: 60,
      },
      rect0: {
        p: {
          x: 0,
          y: 70,
        },
      },
      rect1: {
        p: {
          x: 10,
          y: 70,
        },
      },
      rect2: {
        p: {
          x: 20,
          y: 70,
        },
      },
    });

    expect(getPatchByLayouts(shapeComposite, { update: result })).toEqual(result);
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
