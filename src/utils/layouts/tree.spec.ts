import { describe, expect, test } from "vitest";
import { CHILD_MARGIN, SIBLING_MARGIN, TreeLayoutNode, getTreeBranchSizeMap } from "./tree";
import { getTree } from "../tree";
import { toMap } from "../commons";

describe("getTreeBranchSizes", () => {
  test("should return tree branch sizes: direction 1", () => {
    const rect10 = { x: 0, y: 0, width: 10, height: 10 };
    const src: TreeLayoutNode[] = [
      { id: "a", findex: "a", type: "root", direction: 0, parentId: "", rect: rect10 },
      { id: "b", findex: "b", type: "node", direction: 1, parentId: "a", rect: rect10 },
      { id: "c", findex: "c", type: "node", direction: 1, parentId: "a", rect: rect10 },
      { id: "ba", findex: "ba", type: "node", direction: 1, parentId: "b", rect: rect10 },
      { id: "bb", findex: "bb", type: "node", direction: 1, parentId: "b", rect: rect10 },
    ];
    const result = getTreeBranchSizeMap(toMap(src), getTree(src)[0]);
    expect(result.get("ba")).toEqual({ width: 10, height: 10 });
    expect(result.get("bb")).toEqual({ width: 10, height: 10 });
    expect(result.get("b")).toEqual({ width: 20 + CHILD_MARGIN, height: 20 + SIBLING_MARGIN });
    expect(result.get("c")).toEqual({ width: 10, height: 10 });
    expect(result.get("a")).toEqual({ width: 30 + 2 * CHILD_MARGIN, height: 30 + 2 * SIBLING_MARGIN });
  });

  test("should return tree branch sizes: direction 3", () => {
    const rect10 = { x: 0, y: 0, width: 10, height: 10 };
    const src: TreeLayoutNode[] = [
      { id: "a", findex: "a", type: "root", direction: 0, parentId: "", rect: rect10 },
      { id: "b", findex: "b", type: "node", direction: 3, parentId: "a", rect: rect10 },
      { id: "c", findex: "c", type: "node", direction: 3, parentId: "a", rect: rect10 },
      { id: "ba", findex: "ba", type: "node", direction: 3, parentId: "b", rect: rect10 },
      { id: "bb", findex: "bb", type: "node", direction: 3, parentId: "b", rect: rect10 },
    ];
    const result = getTreeBranchSizeMap(toMap(src), getTree(src)[0]);
    expect(result.get("ba")).toEqual({ width: 10, height: 10 });
    expect(result.get("bb")).toEqual({ width: 10, height: 10 });
    expect(result.get("b")).toEqual({ width: 20 + CHILD_MARGIN, height: 20 + SIBLING_MARGIN });
    expect(result.get("c")).toEqual({ width: 10, height: 10 });
    expect(result.get("a")).toEqual({ width: 30 + 2 * CHILD_MARGIN, height: 30 + 2 * SIBLING_MARGIN });
  });

  test("should return tree branch sizes: direction 1 & 3", () => {
    const rect10 = { x: 0, y: 0, width: 10, height: 10 };
    const src: TreeLayoutNode[] = [
      { id: "a", findex: "a", type: "root", direction: 0, parentId: "", rect: rect10 },
      { id: "b", findex: "b", type: "node", direction: 1, parentId: "a", rect: rect10 },
      { id: "ba", findex: "ba", type: "node", direction: 1, parentId: "b", rect: rect10 },
      { id: "bb", findex: "bb", type: "node", direction: 1, parentId: "b", rect: rect10 },
      { id: "-b", findex: "-b", type: "node", direction: 3, parentId: "a", rect: rect10 },
      { id: "-ba", findex: "-ba", type: "node", direction: 3, parentId: "-b", rect: rect10 },
    ];
    const result = getTreeBranchSizeMap(toMap(src), getTree(src)[0]);
    expect(result.get("a")).toEqual({ width: 50 + 4 * CHILD_MARGIN, height: 20 + SIBLING_MARGIN });
  });

  test("should return tree branch sizes: direction 0", () => {
    const rect10 = { x: 0, y: 0, width: 10, height: 10 };
    const src: TreeLayoutNode[] = [
      { id: "a", findex: "a", type: "root", direction: 0, parentId: "", rect: rect10 },
      { id: "b", findex: "b", type: "node", direction: 0, parentId: "a", rect: rect10 },
      { id: "c", findex: "c", type: "node", direction: 0, parentId: "a", rect: rect10 },
      { id: "ba", findex: "ba", type: "node", direction: 0, parentId: "b", rect: rect10 },
      { id: "bb", findex: "bb", type: "node", direction: 0, parentId: "b", rect: rect10 },
    ];
    const result = getTreeBranchSizeMap(toMap(src), getTree(src)[0]);
    expect(result.get("ba")).toEqual({ height: 10, width: 10 });
    expect(result.get("bb")).toEqual({ height: 10, width: 10 });
    expect(result.get("b")).toEqual({ height: 20 + CHILD_MARGIN, width: 20 + SIBLING_MARGIN });
    expect(result.get("c")).toEqual({ height: 10, width: 10 });
    expect(result.get("a")).toEqual({ height: 30 + 2 * CHILD_MARGIN, width: 30 + 2 * SIBLING_MARGIN });
  });
});
