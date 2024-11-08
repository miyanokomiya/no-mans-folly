import { describe, test, expect } from "vitest";
import { getAllDependants, getAllDependencies, reverseDepMap, topSort, topSortHierarchy } from "./graph";

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

describe("getAllDependants", () => {
  test("should return all dependants of the target", () => {
    const map1 = new Map<string, Set<string>>([
      ["a", new Set(["b", "c"])],
      ["b", new Set()],
      ["c", new Set("d")],
      ["d", new Set()],
    ]);
    expect(getAllDependants(map1, reverseDepMap(map1), ["c"])).toEqual(["a"]);
    expect(getAllDependants(map1, reverseDepMap(map1), ["a"])).toEqual([]);
    expect(getAllDependants(map1, reverseDepMap(map1), ["d"])).toEqual(["c", "a"]);

    const map2 = new Map<string, Set<string>>([
      ["d", new Set()],
      ["c", new Set("d")],
      ["b", new Set(["c"])],
      ["a", new Set(["b"])],
    ]);
    expect(getAllDependants(map2, reverseDepMap(map2), ["a"])).toEqual([]);
    expect(getAllDependants(map2, reverseDepMap(map2), ["b"])).toEqual(["a"]);
    expect(getAllDependants(map2, reverseDepMap(map2), ["c"])).toEqual(["b", "a"]);
    expect(getAllDependants(map2, reverseDepMap(map2), ["d"])).toEqual(["c", "b", "a"]);

    const map3 = new Map<string, Set<string>>([
      ["a", new Set(["b"])],
      ["b", new Set(["c"])],
      ["c", new Set("d")],
      ["d", new Set()],
    ]);
    expect(getAllDependants(map3, reverseDepMap(map3), ["c"])).toEqual(["b", "a"]);
  });

  test("should regard multiple targets", () => {
    const map1 = new Map<string, Set<string>>([
      ["a", new Set(["c"])],
      ["b", new Set(["d"])],
      ["c", new Set(["e"])],
      ["d", new Set()],
      ["e", new Set()],
    ]);
    expect(getAllDependants(map1, reverseDepMap(map1), ["c", "d"])).toEqual(["a", "b"]);
  });

  test("should sever circular dependencies", () => {
    const map1 = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["c"])],
      ["c", new Set(["a"])],
    ]);
    const result0 = getAllDependants(map1, reverseDepMap(map1), ["c"]);
    expect(result0).toEqual(["b", "a"]);
  });
});

describe("getAllDependencies", () => {
  test("should return all dependencies", () => {
    const map1 = new Map<string, Set<string>>([
      ["a", new Set()],
      ["b", new Set(["a"])],
      ["c", new Set(["b"])],
    ]);
    expect(getAllDependencies(map1, ["c"])).toEqual(["b", "a"]);

    const map2 = new Map<string, Set<string>>([
      ["a", new Set()],
      ["b", new Set()],
      ["c", new Set(["b", "a"])],
    ]);
    expect(getAllDependencies(map2, ["c"])).toEqual(["b", "a"]);
  });

  test("should regard multiple targets", () => {
    const map1 = new Map<string, Set<string>>([
      ["a", new Set(["c"])],
      ["b", new Set(["d"])],
      ["c", new Set(["e"])],
      ["d", new Set()],
      ["e", new Set()],
    ]);
    expect(getAllDependencies(map1, ["a", "b"])).toEqual(["c", "e", "d"]);
  });
});

describe("reverseDepMap", () => {
  test("should reverse dependency map", () => {
    expect(
      reverseDepMap(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set(["c"])],
          ["c", new Set(["a"])],
        ]),
      ),
    ).toEqual(
      new Map([
        ["a", new Set(["c"])],
        ["b", new Set(["a"])],
        ["c", new Set(["b"])],
      ]),
    );

    expect(
      reverseDepMap(
        new Map([
          ["a", new Set(["b", "c"])],
          ["b", new Set(["c"])],
          ["c", new Set()],
        ]),
      ),
    ).toEqual(
      new Map([
        ["a", new Set()],
        ["b", new Set(["a"])],
        ["c", new Set(["a", "b"])],
      ]),
    );
  });
});
