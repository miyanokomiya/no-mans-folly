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
    const nodes = target.getTree([
      { id: "a", parentId: "" },
      { id: "aa", parentId: "a" },
      { id: "aaa", parentId: "aa" },
      { id: "b", parentId: "" },
    ]);
    const list: string[] = [];
    target.walkTree(nodes, (node) => list.push(node.id));
    expect(list).toEqual(["a", "aa", "aaa", "b"]);
  });
});
