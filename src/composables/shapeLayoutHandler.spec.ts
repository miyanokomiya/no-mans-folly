import { describe, test, expect } from "vitest";
import {
  getLineRelatedDepMap,
  getPatchAfterLayouts,
  getPatchByLayouts,
  getPatchInfoByLayouts,
} from "./shapeLayoutHandler";
import { createShape, getCommonStruct } from "../shapes";
import { BoardCardShape } from "../shapes/board/boardCard";
import { newShapeComposite } from "./shapeComposite";
import { generateKeyBetween } from "../utils/findex";
import { Shape } from "../models";
import { LineShape } from "../shapes/line";

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

describe("getLineRelatedDepMap", () => {
  test("", () => {
    const ellipseA = createShape(getCommonStruct, "ellipse", {
      id: "ellipseA",
      findex: generateKeyBetween(null, null),
    });
    const lineA = createShape<LineShape>(getCommonStruct, "line", {
      id: "lineA",
      findex: generateKeyBetween(ellipseA.id, null),
      pConnection: { id: ellipseA.id, rate: { x: 0, y: 0 } },
    });
    const rectA = createShape(getCommonStruct, "rectangle", {
      id: "rectA",
      findex: generateKeyBetween(lineA.findex, null),
      attachment: {
        id: lineA.id,
        to: { x: 0, y: 0 },
        anchor: { x: 0, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const rectB: Shape = {
      ...rectA,
      id: "rectA",
      findex: generateKeyBetween(lineA.findex, null),
    };
    const shapeComposite = newShapeComposite({
      shapes: [ellipseA, lineA, rectA, rectB],
      getStruct: getCommonStruct,
    });
    expect(getLineRelatedDepMap(shapeComposite, [rectA.id])).toEqual(
      new Map([
        [ellipseA.id, new Set()],
        [lineA.id, new Set([ellipseA.id])],
        [rectA.id, new Set([lineA.id])],
        [rectB.id, new Set([lineA.id])],
      ]),
    );
  });
});
