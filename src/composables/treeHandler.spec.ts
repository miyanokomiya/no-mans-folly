import { describe, test, expect } from "vitest";
import { getNextTreeLayout, getTreeBranchIds } from "./treeHandler";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { TreeNodeShape } from "../shapes/tree/treeNode";

const root = createShape(getCommonStruct, "tree_root", { id: "root" });
const a = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
  id: "a",
  findex: "a",
  parentId: root.id,
  treeParentId: root.id,
  width: 10,
  height: 10,
  direction: 1,
});
const aa = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
  id: "aa",
  findex: "aa",
  parentId: root.id,
  treeParentId: a.id,
  width: 10,
  height: 10,
  direction: 1,
});
const b = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
  id: "b",
  findex: "b",
  parentId: root.id,
  treeParentId: root.id,
  width: 10,
  height: 10,
  direction: 1,
});
const bb = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
  id: "bb",
  findex: "bb",
  parentId: root.id,
  treeParentId: b.id,
  width: 10,
  height: 10,
  direction: 1,
});
const shapeComposite = newShapeComposite({
  shapes: [root, a, aa, b, bb],
  getStruct: getCommonStruct,
});

describe("getTreeBranchIds", () => {
  test("should return shape ids in the target branches", () => {
    expect(getTreeBranchIds(shapeComposite, ["root"])).toEqual(["root", "a", "aa", "b", "bb"]);
    expect(getTreeBranchIds(shapeComposite, ["a"])).toEqual(["a", "aa"]);
    expect(getTreeBranchIds(shapeComposite, ["aa"])).toEqual(["aa"]);
    expect(getTreeBranchIds(shapeComposite, ["b"])).toEqual(["b", "bb"]);
    expect(getTreeBranchIds(shapeComposite, ["a", "bb"])).toEqual(["a", "aa", "bb"]);
    expect(getTreeBranchIds(shapeComposite, ["a", "aa"])).toEqual(["a", "aa"]);
  });
});

describe("getNextTreeLayout", () => {
  test("should treat a tree node missing its parent as a direct child of the root", () => {
    const cc = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "cc",
      findex: "cc",
      parentId: root.id,
      treeParentId: "c",
      width: 10,
      height: 10,
      direction: 1,
    });
    const shapeComposite = newShapeComposite({
      shapes: [root, a, aa, cc],
      getStruct: getCommonStruct,
    });
    const result = getNextTreeLayout(shapeComposite, "root");
    expect(result["a"].p!.x).toBeCloseTo(result["cc"].p!.x);
    expect(result["aa"].p!.x).not.toBeCloseTo(result["cc"].p!.x);
  });
});
