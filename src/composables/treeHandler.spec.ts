import { describe, test, expect } from "vitest";
import { getTreeBranchIds } from "./treeHandler";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { TreeNodeShape } from "../shapes/tree/treeNode";

describe("getTreeBranchIds", () => {
  test("should return shape ids in the target branches", () => {
    const root = createShape(getCommonStruct, "tree_root", { id: "root" });
    const a = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "a",
      parentId: root.id,
      treeParentId: root.id,
    });
    const aa = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "aa",
      parentId: root.id,
      treeParentId: a.id,
    });
    const b = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "b",
      parentId: root.id,
      treeParentId: root.id,
    });
    const bb = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "bb",
      parentId: root.id,
      treeParentId: b.id,
    });

    const shapeComposite = newShapeComposite({
      shapes: [root, a, aa, b, bb],
      getStruct: getCommonStruct,
    });
    expect(getTreeBranchIds(shapeComposite, ["root"])).toEqual(["root", "a", "aa", "b", "bb"]);
    expect(getTreeBranchIds(shapeComposite, ["a"])).toEqual(["a", "aa"]);
    expect(getTreeBranchIds(shapeComposite, ["aa"])).toEqual(["aa"]);
    expect(getTreeBranchIds(shapeComposite, ["b"])).toEqual(["b", "bb"]);
    expect(getTreeBranchIds(shapeComposite, ["a", "bb"])).toEqual(["a", "aa", "bb"]);
    expect(getTreeBranchIds(shapeComposite, ["a", "aa"])).toEqual(["a", "aa"]);
  });
});
