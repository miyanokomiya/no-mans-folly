import { describe, test, expect } from "vitest";
import { topSort, topSortHierarchy } from "./graph";

describe("topSort", () => {
  test("should return topologically sorted ids", () => {
    const result0 = topSort(
      new Map([
        ["a", new Set(["b", "c"])],
        ["b", new Set()],
        ["c", new Set()],
      ]),
    );
    expect(result0).toEqual(["b", "c", "a"]);

    const result1 = topSort(
      new Map([
        ["a", new Set(["b", "c"])],
        ["b", new Set(["c"])],
        ["c", new Set()],
      ]),
    );
    expect(result1).toEqual(["c", "b", "a"]);
  });

  test("should sever circular dependencies", () => {
    const result0 = topSort(
      new Map([
        ["a", new Set(["b"])],
        ["b", new Set(["c"])],
        ["c", new Set(["a"])],
      ]),
    );
    expect(result0).toEqual(["a", "c", "b"]);
  });

  test("should throw exception if circular dependencies are detected in strict mode", () => {
    expect(() =>
      topSort(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set(["c"])],
          ["c", new Set(["a"])],
        ]),
        true,
      ),
    ).toThrow();
  });
});

describe("topSortHierarchy", () => {
  test("should return topologically sorted ids with hierarchy", () => {
    const result0 = topSortHierarchy(
      new Map([
        ["a", new Set(["b", "c"])],
        ["b", new Set()],
        ["c", new Set()],
      ]),
    );
    expect(result0).toEqual([["b", "c"], ["a"]]);

    const result1 = topSortHierarchy(
      new Map([
        ["a", new Set(["b"])],
        ["b", new Set(["c"])],
        ["c", new Set()],
      ]),
    );
    expect(result1).toEqual([["c"], ["b"], ["a"]]);
  });

  test("result isn't always optimal but correct", () => {
    const result1 = topSortHierarchy(
      new Map([
        ["a", new Set(["d"])],
        ["b", new Set(["f"])],
        ["c", new Set(["f"])],
        ["d", new Set(["b"])],
        ["e", new Set(["b"])],
        ["f", new Set()],
      ]),
    );
    expect(result1).toEqual([["f"], ["b"], ["d"], ["a", "c", "e"]]);

    const result2 = topSortHierarchy(
      new Map([
        ["a", new Set(["b"])],
        ["b", new Set(["c"])],
        ["c", new Set()],
        ["d", new Set(["c"])],
      ]),
    );
    expect(result2).toEqual([["c"], ["b"], ["a", "d"]]);

    const result3 = topSortHierarchy(
      new Map([
        ["a", new Set(["b"])],
        ["b", new Set(["c", "d"])],
        ["c", new Set()],
        ["d", new Set(["c"])],
      ]),
    );
    expect(result3, "multiple dependencies can't be regarded").toEqual([["c"], ["d"], ["b"], ["a"]]);
  });
});
