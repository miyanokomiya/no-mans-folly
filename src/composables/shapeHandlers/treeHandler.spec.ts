import { describe, test, expect } from "vitest";
import {
  canBeGraftTarget,
  generateFindexNextAt,
  generateFindexPreviousAt,
  getModifiedTreeRootIds,
  getNextTreeLayout,
  getPatchToDisconnectBranch,
  getPatchToGraftBranch,
  getTreeBranchIds,
  isValidTreeNode,
  newTreeNodeMovingHandler,
} from "./treeHandler";
import { newShapeComposite } from "../shapeComposite";
import { createShape, getCommonStruct } from "../../shapes";
import { TreeNodeShape } from "../../shapes/tree/treeNode";
import { TreeRootShape } from "../../shapes/tree/treeRoot";
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
  describe("hitTest: horizontal", () => {
    test("should return node moving result: move inside the siblings", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.hitTest({ x: 80, y: -10 }, 1)).toEqual(undefined);
      expect(target.hitTest({ x: 50, y: 40 }, 1)).toEqual(undefined);
      expect(target.hitTest({ x: 50, y: 60 }, 1)).toEqual({
        treeParentId: "root",
        direction: 1,
        findex: generateKeyBetween(b.findex, null),
      });
    });

    test("should return node moving result: move to other parent", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.hitTest({ x: 110, y: 50 }, 1)).toEqual({
        treeParentId: "b",
        direction: 1,
        findex: generateKeyBetween(null, bb.findex),
      });
      expect(target.hitTest({ x: 110, y: 60 }, 1)).toEqual({
        treeParentId: "b",
        direction: 1,
        findex: generateKeyBetween(bb.findex, null),
      });
    });

    test("should return node moving result: become the first child", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.hitTest({ x: 150, y: 50 }, 1)).toEqual({
        treeParentId: "bb",
        direction: 1,
        findex: generateKeyBetween(bb.findex, null),
      });
    });

    test("should return node moving result: should not move to own children", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.hitTest({ x: 110, y: -50 }, 1)).toEqual({
        treeParentId: "b",
        direction: 1,
        findex: generateKeyBetween(null, bb.findex),
      });
    });

    test("should return node moving result: switch direction", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.hitTest({ x: -50, y: 10 }, 1)).toEqual({
        treeParentId: "root",
        direction: 3,
        findex: generateKeyBetween(ia.findex, null),
      });
      expect(target.hitTest({ x: -50, y: 2 }, 1)).toEqual({
        treeParentId: "root",
        direction: 3,
        findex: generateKeyBetween(null, ia.findex),
      });
      expect(target.hitTest({ x: -60, y: 0 }, 1)).toEqual({
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
      expect(target1.hitTest({ x: -50, y: 0 }, 1)).toEqual({
        treeParentId: "root",
        direction: 3,
        findex: generateKeyBetween(root.findex, null),
      });
      expect(target1.hitTest({ x: 50, y: 0 }, 1)).toEqual(undefined);

      const target2 = newTreeNodeMovingHandler({
        getShapeComposite: () =>
          newShapeComposite({
            shapes: [root, ia],
            getStruct: getCommonStruct,
          }),
        targetId: "ia",
      });
      expect(target2.hitTest({ x: 50, y: 0 }, 1)).toEqual({
        treeParentId: "root",
        direction: 1,
        findex: generateKeyBetween(root.findex, null),
      });
      expect(target2.hitTest({ x: -50, y: 0 }, 1)).toEqual(undefined);
    });
  });

  describe("hitTest: vertical", () => {
    const a = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "a",
      findex: generateKeyBetween(root.findex, null),
      parentId: root.id,
      treeParentId: root.id,
      p: { x: -50, y: 50 },
      width: 10,
      height: 10,
      direction: 2,
    });
    const aa = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "aa",
      findex: generateKeyBetween(a.findex, null),
      parentId: root.id,
      treeParentId: a.id,
      p: { x: -100, y: 100 },
      width: 10,
      height: 10,
      direction: 2,
    });
    const b = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "b",
      findex: generateKeyBetween(aa.findex, null),
      parentId: root.id,
      treeParentId: root.id,
      p: { x: 50, y: 50 },
      width: 10,
      height: 10,
      direction: 2,
    });
    const bb = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "bb",
      findex: generateKeyBetween(b.findex, null),
      parentId: root.id,
      treeParentId: b.id,
      p: { x: 50, y: 100 },
      width: 10,
      height: 10,
      direction: 2,
    });
    const ia = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "ia",
      findex: generateKeyBetween(root.findex, null),
      parentId: root.id,
      treeParentId: root.id,
      p: { x: 0, y: -50 },
      width: 10,
      height: 10,
      direction: 0,
    });
    const shapeComposite = newShapeComposite({
      shapes: [root, a, aa, b, bb, ia],
      getStruct: getCommonStruct,
    });

    test("should return node moving result: move inside the siblings", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.hitTest({ x: -10, y: 80 }, 1)).toEqual(undefined);
      expect(target.hitTest({ x: 40, y: 50 }, 1)).toEqual(undefined);
      expect(target.hitTest({ x: 60, y: 50 }, 1)).toEqual({
        treeParentId: "root",
        direction: 2,
        findex: generateKeyBetween(b.findex, null),
      });
    });

    test("should return node moving result: move to other parent", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.hitTest({ x: 50, y: 110 }, 1)).toEqual({
        treeParentId: "b",
        direction: 2,
        findex: generateKeyBetween(null, bb.findex),
      });
      expect(target.hitTest({ x: 60, y: 110 }, 1)).toEqual({
        treeParentId: "b",
        direction: 2,
        findex: generateKeyBetween(bb.findex, null),
      });
    });

    test("should return node moving result: become the first child", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.hitTest({ x: 50, y: 150 }, 1)).toEqual({
        treeParentId: "bb",
        direction: 2,
        findex: generateKeyBetween(bb.findex, null),
      });
    });

    test("should return node moving result: should not move to own children", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.hitTest({ x: -50, y: 110 }, 1)).toEqual({
        treeParentId: "b",
        direction: 2,
        findex: generateKeyBetween(null, bb.findex),
      });
    });

    test("should return node moving result: switch direction", () => {
      const target = newTreeNodeMovingHandler({ getShapeComposite: () => shapeComposite, targetId: "a" });
      expect(target.hitTest({ x: 10, y: -50 }, 1)).toEqual({
        treeParentId: "root",
        direction: 0,
        findex: generateKeyBetween(ia.findex, null),
      });
      expect(target.hitTest({ x: 2, y: -50 }, 1)).toEqual({
        treeParentId: "root",
        direction: 0,
        findex: generateKeyBetween(null, ia.findex),
      });
      expect(target.hitTest({ x: 0, y: -60 }, 1)).toEqual({
        treeParentId: "ia",
        direction: 0,
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
      expect(target1.hitTest({ x: 0, y: -50 }, 1)).toEqual({
        treeParentId: "root",
        direction: 0,
        findex: generateKeyBetween(root.findex, null),
      });
      expect(target1.hitTest({ x: 0, y: 50 }, 1)).toEqual(undefined);

      const target2 = newTreeNodeMovingHandler({
        getShapeComposite: () =>
          newShapeComposite({
            shapes: [root, ia],
            getStruct: getCommonStruct,
          }),
        targetId: "ia",
      });
      expect(target2.hitTest({ x: 0, y: 50 }, 1)).toEqual({
        treeParentId: "root",
        direction: 2,
        findex: generateKeyBetween(root.findex, null),
      });
      expect(target2.hitTest({ x: 0, y: -50 }, 1)).toEqual(undefined);
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

describe("getPatchToDisconnectBranch", () => {
  test("should return patch data to disconnect the branch and make it new tree root", () => {
    const result = getPatchToDisconnectBranch(shapeComposite, "a");
    expect(result).toEqual({
      a: { type: "tree_root" },
      aa: { parentId: "a" },
    });
    expect(result["a"]).toHaveProperty("parentId");
    expect(result["a"]).toHaveProperty("treeParentId");
    expect(result["a"]).toHaveProperty("direction");
    expect(result["a"]).toHaveProperty("vAlign");
    expect(result["a"]).toHaveProperty("hAlign");
  });
});

describe("getPatchToGraftBranch", () => {
  const root1 = createShape<TreeRootShape>(getCommonStruct, "tree_root", {
    id: "root1",
    findex: generateKeyBetween(null, null),
  });
  const a1 = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
    id: "a1",
    findex: generateKeyBetween(root1.findex, null),
    parentId: root1.id,
    treeParentId: root1.id,
    direction: 2,
  });
  test("should return patch data to graft the branch to other tree", () => {
    const shapeComposite = newShapeComposite({
      shapes: [root, a, aa, b, bb, ia, root1, a1],
      getStruct: getCommonStruct,
    });
    expect(getPatchToGraftBranch(shapeComposite, "root1", "a")).toEqual({
      root1: {
        type: "tree_node",
        findex: generateKeyBetween(aa.findex, null),
        parentId: "root",
        treeParentId: "a",
        direction: 1,
        vAlign: "center",
        hAlign: "left",
      },
      a1: { parentId: "root", direction: 1, vAlign: "center", hAlign: "left" },
    });
  });

  test("should inherit elder sibling's dropdown attribute", () => {
    const shapeComposite = newShapeComposite({
      shapes: [root, { ...a, dropdown: 2 } as TreeNodeShape, { ...b, dropdown: 2 } as TreeNodeShape, root1, a1],
      getStruct: getCommonStruct,
    });
    expect(getPatchToGraftBranch(shapeComposite, "root1", "root")).toEqual({
      root1: {
        type: "tree_node",
        findex: generateKeyBetween(b.findex, null),
        parentId: "root",
        treeParentId: "root",
        direction: 1,
        dropdown: 2,
        vAlign: "center",
        hAlign: "left",
      },
      a1: { parentId: "root", direction: 1, dropdown: 2, vAlign: "center", hAlign: "left" },
    });
    expect(getPatchToGraftBranch(shapeComposite, "root1", "a")).toEqual({
      root1: {
        type: "tree_node",
        parentId: "root",
        treeParentId: "a",
        direction: 1,
        dropdown: 2,
        vAlign: "center",
        hAlign: "left",
      },
      a1: { parentId: "root", direction: 1, dropdown: 2, vAlign: "center", hAlign: "left" },
    });
  });
});

describe("isValidTreeNode", () => {
  test("should return true when a shape has valid tree root and parent", () => {
    const noTreeParent = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "noTreeParent",
      parentId: root.id,
    });
    const noTreeRoot = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "noTreeRoot",
      treeParentId: root.id,
    });
    const shapeComposite = newShapeComposite({
      shapes: [root, a, aa, noTreeParent, noTreeRoot],
      getStruct: getCommonStruct,
    });
    expect(isValidTreeNode(shapeComposite, a)).toBe(true);
    expect(isValidTreeNode(shapeComposite, aa)).toBe(true);
    expect(isValidTreeNode(shapeComposite, noTreeParent)).toBe(false);
    expect(isValidTreeNode(shapeComposite, noTreeRoot)).toBe(false);
  });
});

describe("canBeGraftTarget", () => {
  test("should return true when a shape is tree root or valid tree node", () => {
    const noTreeParent = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "noTreeParent",
      parentId: root.id,
    });
    const noTreeRoot = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "noTreeRoot",
      treeParentId: root.id,
    });
    const shapeComposite = newShapeComposite({
      shapes: [root, a, aa, noTreeParent, noTreeRoot],
      getStruct: getCommonStruct,
    });
    expect(canBeGraftTarget(shapeComposite, root)).toBe(true);
    expect(canBeGraftTarget(shapeComposite, a)).toBe(true);
    expect(canBeGraftTarget(shapeComposite, aa)).toBe(true);
    expect(canBeGraftTarget(shapeComposite, noTreeParent)).toBe(false);
    expect(canBeGraftTarget(shapeComposite, noTreeRoot)).toBe(false);
  });
});
