import { describe, test, expect } from "vitest";
import { getPatchByPointerUpOutsideLayout } from "./movingShapeLayoutHandler";
import { newShapeComposite } from "../../shapeComposite";
import { createShape, getCommonStruct } from "../../../shapes";

describe("getPatchByPointerUpOutsideLayout", () => {
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

  test("should detach the parent when the selected shapes cna leave it", () => {
    const res = getPatchByPointerUpOutsideLayout(
      shapeComposite,
      {
        [boardCard.id]: { p: { x: 1, y: 2 } },
        [alignChild.id]: { p: { x: 1, y: 2 } },
        [groupChild.id]: { p: { x: 1, y: 2 } },
      },
      [boardCard.id, alignChild.id, groupChild.id],
    );

    expect(res[boardCard.id]).toEqual({ p: { x: 1, y: 2 }, parentId: undefined });
    expect(res[boardCard.id], "board_card can leave its parent").toHaveProperty("parentId");

    expect(res[alignChild.id]).toEqual({ p: { x: 1, y: 2 }, parentId: undefined });
    expect(res[alignChild.id], "a child of an align_box can leave its parent").toHaveProperty("parentId");

    expect(res[groupChild.id]).toEqual({ p: { x: 1, y: 2 } });
    expect(res[groupChild.id], "a child of a group can't leave its parent").not.toHaveProperty("parentId");
  });

  test("should not detach the parent when a shape isn't selected", () => {
    const res0 = getPatchByPointerUpOutsideLayout(
      shapeComposite,
      {
        [boardCard.id]: { p: { x: 1, y: 2 } },
      },
      [boardCard.id],
    );
    expect(res0[boardCard.id]).toHaveProperty("parentId");
    expect(res0[alignChild.id]).toBe(undefined);
    expect(res0[groupChild.id]).toBe(undefined);

    const res1 = getPatchByPointerUpOutsideLayout(
      shapeComposite,
      {
        [alignBox.id]: { p: { x: 1, y: 2 } },
      },
      [alignBox.id],
    );
    expect(res1[alignBox.id]).toEqual({ p: { x: 1, y: 2 } });
    expect(res1[alignChild.id]).toEqual({ p: { x: 1, y: 2 } });
    expect(res1[alignChild.id]).not.toHaveProperty("parentId");
  });
});
