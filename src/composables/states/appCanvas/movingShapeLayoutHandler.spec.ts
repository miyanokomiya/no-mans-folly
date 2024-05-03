import { describe, test, expect } from "vitest";
import { getPatchByPointerUpOutsideLayout } from "./movingShapeLayoutHandler";
import { newShapeComposite } from "../../shapeComposite";
import { createShape, getCommonStruct } from "../../../shapes";

describe("getPatchByPointerUpOutsideLayout", () => {
  test("should detach the parent when the shape cna leave it", () => {
    const boardRoot = createShape(getCommonStruct, "board_root", { id: "board_root" });
    const boardCard = createShape(getCommonStruct, "board_card", { id: "board_card", parentId: boardRoot.id });
    const alignBox = createShape(getCommonStruct, "align_box", { id: "align_box" });
    const alignChild = createShape(getCommonStruct, "rectangle", { id: "align_child", parentId: alignBox.id });
    const group = createShape(getCommonStruct, "group", { id: "group" });
    const groupChild = createShape(getCommonStruct, "rectangle", { id: "group_child", parentId: group.id });
    const shapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [boardRoot, boardCard, alignBox, alignChild, group, groupChild],
    });
    const ctx = {
      getShapeComposite: () => shapeComposite,
    };
    const res = getPatchByPointerUpOutsideLayout(ctx, {
      [boardCard.id]: { p: { x: 1, y: 2 } },
      [alignChild.id]: { p: { x: 1, y: 2 } },
      [groupChild.id]: { p: { x: 1, y: 2 } },
    });

    expect(res[boardCard.id]).toEqual({ p: { x: 1, y: 2 }, parentId: undefined });
    expect(res[boardCard.id], "board_card can leave its parent").toHaveProperty("parentId");

    expect(res[alignChild.id]).toEqual({ p: { x: 1, y: 2 }, parentId: undefined });
    expect(res[alignChild.id], "a child of an align_box can leave its parent").toHaveProperty("parentId");

    expect(res[groupChild.id]).toEqual({ p: { x: 1, y: 2 } });
    expect(res[groupChild.id], "a child of a group can't leave its parent").not.toHaveProperty("parentId");
  });
});
