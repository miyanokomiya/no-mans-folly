import { describe, expect, test } from "vitest";
import { CHILD_MARGIN, SIBLING_MARGIN, getTreeBranchPositionMap, getTreeBranchSizeMap } from "./dropDownTree";
import { getTree } from "../tree";
import { toMap } from "../commons";
import { TreeLayoutNode } from "./tree";

describe("getTreeBranchPositionMap", () => {
  test("should return tree branch positions: dropdown: 2, direction 1", () => {
    const rect10 = { x: 0, y: 0, width: 10, height: 10 };
    const src: TreeLayoutNode[] = [
      { id: "a", findex: "a", type: "root", direction: 1, dropdown: 2, parentId: "", rect: rect10 },
      { id: "b", findex: "b", type: "node", direction: 1, dropdown: 2, parentId: "a", rect: rect10 },
      { id: "c", findex: "c", type: "node", direction: 1, dropdown: 2, parentId: "a", rect: rect10 },
      { id: "ba", findex: "ba", type: "node", direction: 1, dropdown: 2, parentId: "b", rect: rect10 },
      { id: "bb", findex: "bb", type: "node", direction: 1, dropdown: 2, parentId: "b", rect: rect10 },
    ];
    const branchSizeMap = getTreeBranchSizeMap(toMap(src), getTree(src)[0], 30, 50);
    const result = getTreeBranchPositionMap(toMap(src), getTree(src)[0], branchSizeMap, 30, 50);
    expect(result.get("a")).toEqual({ x: 0, y: 0 });
    expect(result.get("b")).toEqual({ x: 5 + CHILD_MARGIN, y: 10 + SIBLING_MARGIN });
    expect(result.get("c")).toEqual({ x: 5 + CHILD_MARGIN, y: (10 + SIBLING_MARGIN) * 4 });
    expect(result.get("ba")).toEqual({ x: (5 + CHILD_MARGIN) * 2, y: (10 + SIBLING_MARGIN) * 2 });
    expect(result.get("bb")).toEqual({ x: (5 + CHILD_MARGIN) * 2, y: (10 + SIBLING_MARGIN) * 3 });
  });

  test("should return tree branch positions: dropdown: 2, direction 1, 2 nodes", () => {
    const rect10 = { x: 0, y: 0, width: 10, height: 10 };
    const src: TreeLayoutNode[] = [
      {
        id: "a",
        findex: "a",
        type: "root",
        direction: 1,
        dropdown: 2,
        parentId: "",
        rect: { x: 0, y: 0, width: 10, height: 30 },
      },
      { id: "b", findex: "b", type: "node", direction: 1, dropdown: 2, parentId: "a", rect: rect10 },
    ];
    const branchSizeMap = getTreeBranchSizeMap(toMap(src), getTree(src)[0], 30, 50);
    const result = getTreeBranchPositionMap(toMap(src), getTree(src)[0], branchSizeMap, 30, 50);
    expect(result.get("a")).toEqual({ x: 0, y: 0 });
    expect(result.get("b")).toEqual({ x: 5 + CHILD_MARGIN, y: 30 + SIBLING_MARGIN });
  });

  test("should return tree branch positions: dropdown: 2, direction 3, 2 nodes", () => {
    const rect10 = { x: 0, y: 0, width: 10, height: 10 };
    const src: TreeLayoutNode[] = [
      {
        id: "a",
        findex: "a",
        type: "root",
        direction: 3,
        dropdown: 2,
        parentId: "",
        rect: { x: 0, y: 0, width: 10, height: 30 },
      },
      { id: "b", findex: "b", type: "node", direction: 3, dropdown: 2, parentId: "a", rect: rect10 },
    ];
    const branchSizeMap = getTreeBranchSizeMap(toMap(src), getTree(src)[0], 30, 50);
    const result = getTreeBranchPositionMap(toMap(src), getTree(src)[0], branchSizeMap, 30, 50);
    expect(result.get("a")).toEqual({ x: 0, y: 0 });
    expect(result.get("b")).toEqual({ x: 5 - 10 - CHILD_MARGIN, y: 30 + SIBLING_MARGIN });
  });

  test("should return tree branch positions: dropdown: 0, direction 1, 2 nodes", () => {
    const rect10 = { x: 0, y: 0, width: 10, height: 10 };
    const src: TreeLayoutNode[] = [
      {
        id: "a",
        findex: "a",
        type: "root",
        direction: 1,
        dropdown: 0,
        parentId: "",
        rect: { x: 0, y: 0, width: 10, height: 30 },
      },
      { id: "b", findex: "b", type: "node", direction: 1, dropdown: 0, parentId: "a", rect: rect10 },
    ];
    const branchSizeMap = getTreeBranchSizeMap(toMap(src), getTree(src)[0], 30, 50);
    const result = getTreeBranchPositionMap(toMap(src), getTree(src)[0], branchSizeMap, 30, 50);
    expect(result.get("a")).toEqual({ x: 0, y: 0 });
    expect(result.get("b")).toEqual({ x: 5 + CHILD_MARGIN, y: -10 - SIBLING_MARGIN });
  });

  test("should return tree branch positions: dropdown: 0, direction 3, 2 nodes", () => {
    const rect10 = { x: 0, y: 0, width: 10, height: 10 };
    const src: TreeLayoutNode[] = [
      {
        id: "a",
        findex: "a",
        type: "root",
        direction: 3,
        dropdown: 0,
        parentId: "",
        rect: { x: 0, y: 0, width: 10, height: 30 },
      },
      { id: "b", findex: "b", type: "node", direction: 3, dropdown: 0, parentId: "a", rect: rect10 },
    ];
    const branchSizeMap = getTreeBranchSizeMap(toMap(src), getTree(src)[0], 30, 50);
    const result = getTreeBranchPositionMap(toMap(src), getTree(src)[0], branchSizeMap, 30, 50);
    expect(result.get("a")).toEqual({ x: 0, y: 0 });
    expect(result.get("b")).toEqual({ x: 5 - 10 - CHILD_MARGIN, y: -10 - SIBLING_MARGIN });
  });
});
