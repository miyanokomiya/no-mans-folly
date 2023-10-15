import { describe, test, expect } from "vitest";
import {
  generateFindexNextAt,
  generateFindexPreviousAt,
  getModifiedTreeRootIds,
  getNextTreeLayout,
  getTreeBranchIds,
  newTreeNodeMovingHandler,
} from "./treeHandler";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { TreeNodeShape } from "../shapes/tree/treeNode";
import { TreeRootShape } from "../shapes/tree/treeRoot";
import { generateKeyBetween } from "fractional-indexing";

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
const bb = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
  id: "bb",
  findex: generateKeyBetween(b.findex, null),
  parentId: root.id,
  treeParentId: b.id,
  p: { x: 100, y: 50 },
  width: 10,
  height: 10,
  direction: 1,
});
const ia = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
  id: "ia",
  findex: generateKeyBetween(root.findex, null),
  parentId: root.id,
  treeParentId: root.id,
  p: { x: -50, y: 0 },
  width: 10,
  height: 10,
  direction: 3,
});
const shapeComposite = newShapeComposite({
  shapes: [root, a, aa, b, bb, ia],
  getStruct: getCommonStruct,
});

describe("newTreeNodeMovingHandler", () => {
  describe("moveTest", () => {
    test("should return node moving result: move inside the siblings", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.moveTest({ x: 80, y: -10 })).toEqual(undefined);
      expect(target.moveTest({ x: 50, y: 40 })).toEqual(undefined);
      expect(target.moveTest({ x: 50, y: 60 })).toEqual({
        treeParentId: "root",
        direction: 1,
        findex: generateKeyBetween(b.findex, null),
      });
    });

    test("should return node moving result: move to other parent", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.moveTest({ x: 110, y: 50 })).toEqual({
        treeParentId: "b",
        direction: 1,
        findex: generateKeyBetween(null, bb.findex),
      });
      expect(target.moveTest({ x: 110, y: 60 })).toEqual({
        treeParentId: "b",
        direction: 1,
        findex: generateKeyBetween(bb.findex, null),
      });
    });

    test("should return node moving result: become the first child", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.moveTest({ x: 150, y: 50 })).toEqual({
        treeParentId: "bb",
        direction: 1,
        findex: generateKeyBetween(bb.findex, null),
      });
    });

    test("should return node moving result: should not move to own children", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.moveTest({ x: 110, y: -50 })).toEqual({
        treeParentId: "b",
        direction: 1,
        findex: generateKeyBetween(null, bb.findex),
      });
    });

    test("should return node moving result: switch direction", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.moveTest({ x: -50, y: 10 })).toEqual({
        treeParentId: "root",
        direction: 3,
        findex: generateKeyBetween(ia.findex, null),
      });
      expect(target.moveTest({ x: -50, y: 2 })).toEqual({
        treeParentId: "root",
        direction: 3,
        findex: generateKeyBetween(null, ia.findex),
      });
      expect(target.moveTest({ x: -60, y: 0 })).toEqual({
        treeParentId: "ia",
        direction: 3,
        findex: generateKeyBetween(ia.findex, null),
      });
    });

    test("should return node moving result: switch direction & no siblings", () => {
      const target1 = newTreeNodeMovingHandler({
        getShapeComposite: () =>
          newShapeComposite({
            shapes: [root, a],
            getStruct: getCommonStruct,
          }),
        targetId: "a",
      });
      expect(target1.moveTest({ x: -50, y: 0 })).toEqual({
        treeParentId: "root",
        direction: 3,
        findex: generateKeyBetween(root.findex, null),
      });
      expect(target1.moveTest({ x: 50, y: 0 })).toEqual(undefined);

      const target2 = newTreeNodeMovingHandler({
        getShapeComposite: () =>
          newShapeComposite({
            shapes: [root, ia],
            getStruct: getCommonStruct,
          }),
        targetId: "ia",
      });
      expect(target2.moveTest({ x: 50, y: 0 })).toEqual({
        treeParentId: "root",
        direction: 1,
        findex: generateKeyBetween(root.findex, null),
      });
      expect(target2.moveTest({ x: -50, y: 0 })).toEqual(undefined);
    });
  });

  describe("branchIds", () => {
    test("should return branch ids belonging to the target shape", () => {
      expect(newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" }).branchIds).toEqual([
        "a",
        "aa",
      ]);
      expect(newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "b" }).branchIds).toEqual([
        "b",
        "bb",
      ]);
      expect(newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "bb" }).branchIds).toEqual([
        "bb",
      ]);
    });
  });
});

describe("getTreeBranchIds", () => {
  test("should return shape ids in the target branches", () => {
    expect(getTreeBranchIds(shapeComposite, ["root"])).toEqual(["root", "a", "aa", "b", "bb", "ia"]);
    expect(getTreeBranchIds(shapeComposite, ["a"])).toEqual(["a", "aa"]);
    expect(getTreeBranchIds(shapeComposite, ["aa"])).toEqual(["aa"]);
    expect(getTreeBranchIds(shapeComposite, ["b"])).toEqual(["b", "bb"]);
    expect(getTreeBranchIds(shapeComposite, ["a", "bb"])).toEqual(["a", "aa", "bb"]);
    expect(getTreeBranchIds(shapeComposite, ["a", "aa"])).toEqual(["a", "aa"]);
  });
});

describe("generateFindexPreviousAt", () => {
  test("should return shape ids in the target branches", () => {
    expect(generateFindexPreviousAt(shapeComposite, "a")).toBe(generateKeyBetween(null, a.findex));
    expect(generateFindexPreviousAt(shapeComposite, "b")).toBe(generateKeyBetween(a.findex, b.findex));
  });
});

describe("generateFindexNextAt", () => {
  test("should return shape ids in the target branches", () => {
    expect(generateFindexNextAt(shapeComposite, "a")).toBe(generateKeyBetween(a.findex, b.findex));
    expect(generateFindexNextAt(shapeComposite, "b")).toBe(generateKeyBetween(b.findex, null));
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

describe("getModifiedTreeRootIds", () => {
  test("should return modified tree root ids", () => {
    expect(getModifiedTreeRootIds(shapeComposite, {})).toEqual([]);

    expect(
      getModifiedTreeRootIds(shapeComposite, {
        update: { a: { findex: "zz" } },
      }),
    ).toEqual(["root"]);
  });

  test("should not return deleted tree root ids even if its content is modified", () => {
    expect(
      getModifiedTreeRootIds(shapeComposite, {
        update: { a: { findex: "zz" }, root: { p: { x: 10, y: 10 } } },
        delete: ["root"],
      }),
    ).toEqual([]);
  });
});
