import { describe, test, expect } from "vitest";
import * as target from "./tree";
import { toMap } from "./commons";

describe("getTree", () => {
  test("get nodes tree: nested children", () => {
    const items = [
      { id: "a", parentId: "" },
      { id: "aa", parentId: "a" },
      { id: "aaa", parentId: "aa" },
      { id: "b", parentId: "" },
    ];
    expect(target.getTree(items)).toEqual([
      {
        id: "a",
        children: [
          {
            id: "aa",
            children: [{ id: "aaa", children: [], parentId: "aa" }],
            parentId: "a",
          },
        ],
      },
      { id: "b", children: [] },
    ]);
  });
  test("get nodes tree: multi children", () => {
    const items = [
      { id: "a", parentId: "" },
      { id: "aa", parentId: "a" },
      { id: "ab", parentId: "a" },
    ];
    expect(target.getTree(items)).toEqual([
      {
        id: "a",
        children: [
          { id: "aa", children: [], parentId: "a" },
          { id: "ab", children: [], parentId: "a" },
        ],
      },
    ]);
  });
  test("ignore the parent does not exist", () => {
    const items = [
      { id: "a", parentId: "" },
      { id: "aa", parentId: "a" },
      { id: "ab", parentId: "b" },
    ];
    expect(target.getTree(items)).toEqual([
      {
        id: "a",
        children: [{ id: "aa", children: [], parentId: "a" }],
      },
      { id: "ab", children: [] },
    ]);
  });
});

describe("walkTree", () => {
  test("should walk all nodes", () => {
    const tree = target.getTree([
      { id: "a", parentId: "" },
      { id: "aa", parentId: "a" },
      { id: "aaa", parentId: "aa" },
      { id: "b", parentId: "" },
    ]);
    const list: string[] = [];
    target.walkTree(tree, (node) => list.push(node.id));
    expect(list).toEqual(["a", "aa", "aaa", "b"]);
  });
});

describe("flatTree", () => {
  test("should flat all nodes", () => {
    const tree = target.getTree([
      { id: "aa", parentId: "a" },
      { id: "a", parentId: "" },
      { id: "b", parentId: "" },
      { id: "aaa", parentId: "aa" },
    ]);
    expect(target.flatTree(tree).map((n) => n.id)).toEqual(["a", "aa", "aaa", "b"]);
  });
});

describe("getAllBranchIds", () => {
  test("should get all branch ids: targets and all nodes under them", () => {
    const tree = target.getTree([
      { id: "aaa", parentId: "aa" },
      { id: "a", parentId: "" },
      { id: "aa", parentId: "a" },
      { id: "bb", parentId: "b" },
      { id: "b", parentId: "" },
    ]);
    expect(target.getAllBranchIds(tree, ["a", "b"])).toEqual(["a", "aa", "aaa", "b", "bb"]);
  });
});

describe("getBranchPath", () => {
  test("should return ids from the root to the target", () => {
    const tree = target.getTree([
      { id: "a", parentId: "" },
      { id: "aa", parentId: "a" },
      { id: "ab", parentId: "a" },
      { id: "aaa", parentId: "aa" },
      { id: "aab", parentId: "aa" },
      { id: "b", parentId: "" },
      { id: "bb", parentId: "b" },
    ]);
    const nodeMap = toMap(target.flatTree(tree));
    expect(target.getBranchPath(nodeMap, "a")).toEqual(["a"]);
    expect(target.getBranchPath(nodeMap, "aa")).toEqual(["a", "aa"]);
    expect(target.getBranchPath(nodeMap, "aab")).toEqual(["a", "aa", "aab"]);
    expect(target.getBranchPath(nodeMap, "bb")).toEqual(["b", "bb"]);
    expect(target.getBranchPath(nodeMap, "cc")).toEqual([]);
  });
});
