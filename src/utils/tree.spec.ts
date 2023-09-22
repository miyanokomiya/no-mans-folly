import { describe, test, expect } from "vitest";
import * as target from "./tree";

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
        parentId: "",
        children: [
          {
            id: "aa",
            children: [{ id: "aaa", children: [], parentId: "aa" }],
            parentId: "a",
          },
        ],
      },
      { id: "b", children: [], parentId: "" },
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
        parentId: "",
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
        parentId: "",
        children: [{ id: "aa", children: [], parentId: "a" }],
      },
      { id: "ab", children: [], parentId: "b" },
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
