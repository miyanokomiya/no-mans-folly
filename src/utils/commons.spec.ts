import { describe, test, expect } from "vitest";
import * as target from "./commons";

describe("toKeyMap", () => {
  test("should convert list to map", () => {
    expect(
      target.toKeyMap(
        [
          { a: 1, b: 20 },
          { a: 2, b: 21 },
        ],
        "a",
      ),
    ).toEqual({
      1: { a: 1, b: 20 },
      2: { a: 2, b: 21 },
    });
  });
});

describe("toMap", () => {
  test("should convert list to map by id", () => {
    expect(
      target.toMap([
        { id: "1", props: "a" },
        { id: "2", props: "b" },
      ]),
    ).toEqual({
      1: { id: "1", props: "a" },
      2: { id: "2", props: "b" },
    });
  });
});

describe("toList", () => {
  test("should covert map to list", () => {
    expect(
      target.toList({
        1: { a: 1, b: 20 },
        2: { a: 2, b: 21 },
      }),
    ).toEqual([
      { a: 1, b: 20 },
      { a: 2, b: 21 },
    ]);
  });
});

describe("findBackward", () => {
  test("should find last item under the condition", () => {
    expect(
      target.findBackward(
        [
          { id: "a", v: 0 },
          { id: "b", v: 1 },
          { id: "c", v: 0 },
          { id: "d", v: 1 },
        ],
        (d) => d.v === 0,
      ),
    ).toEqual({ id: "c", v: 0 });
  });
});

describe("mergeMap", () => {
  test("should merge two maps", () => {
    expect(target.mergeMap<any>({ a: { aa: 1 }, b: { ba: 10, bb: 20 } }, { b: { bb: 21 } })).toEqual({
      a: { aa: 1 },
      b: { ba: 10, bb: 21 },
    });
  });
  test("override nested props", () => {
    expect(target.mergeMap<any>({ a: { aa: { aaa: 1, aab: 2 } } }, { a: { aa: { aab: 20 } } })).toEqual({
      a: { aa: { aab: 20 } },
    });
  });
});

describe("remap", () => {
  test("should remap by new ids", () => {
    expect(target.remap<any>({ a: { v: 1 }, b: { v: 2 } }, { x: "a", y: "b" })).toEqual({
      x: { v: 1 },
      y: { v: 2 },
    });
  });
});

describe("mapDataToObj", () => {
  test("should return object format", () => {
    expect(
      target.mapDataToObj<any>([
        ["a", { v: 1 }],
        ["b", { v: 2 }],
      ]),
    ).toEqual({
      a: { v: 1 },
      b: { v: 2 },
    });
  });
});

describe("mapFilter", () => {
  test("should filter items returning true value", () => {
    expect(
      target.mapFilter(
        {
          1: { a: 1 },
          2: { a: 2 },
          3: { a: 3 },
          4: { a: 4 },
        },
        (val) => val.a % 2 === 0,
      ),
    ).toEqual({
      2: { a: 2 },
      4: { a: 4 },
    });
  });
});

describe("mapReduce", () => {
  test("should apply the operation for each item", () => {
    expect(
      target.mapReduce(
        {
          id_a: {
            a: 1,
            b: 2,
          },
          id_b: {
            a: 4,
            b: 8,
          },
        },
        (obj: { a: number; b: number }) => ({ a: obj.b, b: obj.a }),
      ),
    ).toEqual({
      id_a: {
        a: 2,
        b: 1,
      },
      id_b: {
        a: 8,
        b: 4,
      },
    });
  });
});

describe("patchPipe", () => {
  test("should call patch functions", () => {
    expect(
      target.patchPipe<{ id: string; v: number }>(
        [
          (src) => {
            return { a: { v: src["a"].v! * 2 } };
          },
          (src) => {
            return { a: { v: src["a"].v! * 3 } };
          },
        ],
        { a: { id: "a", v: 1 }, b: { id: "b", v: 10 } },
      ),
    ).toEqual({
      patch: { a: { v: 6 } },
      result: { a: { id: "a", v: 6 }, b: { id: "b", v: 10 } },
    });

    expect(
      target.patchPipe<{ id: string; v: number }>(
        [
          (src) => {
            return { a: { v: src["a"].v! * 2 } };
          },
          (src, patch) => {
            return { b: { v: src["b"].v! * 3 + patch["a"].v! } };
          },
        ],
        { a: { id: "a", v: 1 }, b: { id: "b", v: 10 } },
      ),
    ).toEqual({
      patch: { a: { v: 2 }, b: { v: 32 } },
      result: { a: { id: "a", v: 2 }, b: { id: "b", v: 32 } },
    });
  });
});

describe("groupBy", () => {
  test("should return grouped item list", () => {
    expect(
      target.groupBy(
        [
          { id: "a", value: 0 },
          { id: "b", value: 0 },
          { id: "c", value: 1 },
        ],
        (item) => item.value,
      ),
    ).toEqual({
      0: [
        { id: "a", value: 0 },
        { id: "b", value: 0 },
      ],
      1: [{ id: "c", value: 1 }],
    });
  });
});

describe("getFirstItemOfMap", () => {
  test("should return the first item of the map", () => {
    const map = new Map([
      ["a", 0],
      ["b", 1],
    ]);
    expect(target.getFirstItemOfMap(map)).toBe(0);
    expect(target.getFirstItemOfMap(new Map())).toBe(undefined);
  });
});

describe("getlastItemOfMap", () => {
  test("should return the first item of the map", () => {
    const map = new Map([
      ["a", 0],
      ["b", 1],
    ]);
    expect(target.getlastItemOfMap(map)).toBe(1);
    expect(target.getlastItemOfMap(new Map())).toBe(undefined);
  });
});
