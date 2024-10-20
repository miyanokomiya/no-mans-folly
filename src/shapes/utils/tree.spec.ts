import { describe, test, expect } from "vitest";
import { patchByRegenerateTreeStructure } from "./tree";
import { createShape, getCommonStruct } from "..";
import { TreeRootShape } from "../tree/treeRoot";
import { generateKeyBetween } from "../../utils/findex";
import { TreeNodeShape } from "../tree/treeNode";

const root = createShape<TreeRootShape>(getCommonStruct, "tree_root", {
  id: "root",
  findex: generateKeyBetween(null, null),
  p: { x: 0, y: 0 },
  width: 10,
  height: 10,
});
const a = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
  id: "a",
  findex: generateKeyBetween(root.findex, null),
  parentId: root.id,
  treeParentId: root.id,
  p: { x: 50, y: -50 },
  width: 10,
  height: 10,
  direction: 1,
});
const aa = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
  id: "aa",
  findex: generateKeyBetween(a.findex, null),
  parentId: root.id,
  treeParentId: a.id,
  p: { x: 100, y: -50 },
  width: 10,
  height: 10,
  direction: 1,
});
const b = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
  id: "b",
  findex: generateKeyBetween(aa.findex, null),
  parentId: root.id,
  treeParentId: root.id,
  p: { x: 50, y: 50 },
  width: 10,
  height: 10,
  direction: 1,
});

describe("patchByRegenerateTreeStructure", () => {
  test("should regenerate tree structure", () => {
    const result = patchByRegenerateTreeStructure([a, aa, b]);
    expect(result[a.id]).toEqual({ type: "tree_root" });
    expect(result[a.id]).toHaveProperty("parentId");
    expect(result[a.id]).toHaveProperty("treeParentId");
    expect(result[aa.id]).toEqual({ parentId: "a" });
    expect(result[b.id]).toEqual({ type: "tree_root" });
    expect(result[b.id]).toHaveProperty("parentId");
    expect(result[b.id]).toHaveProperty("treeParentId");
  });

  test("every isolated node should become tree root", () => {
    const result = patchByRegenerateTreeStructure([root, aa]);
    expect(result[aa.id]).toEqual({ type: "tree_root" });
    expect(result[aa.id]).toHaveProperty("parentId");
    expect(result[aa.id]).toHaveProperty("treeParentId");
  });
});
