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
  test("should return the same instance when either of items is undefined", () => {
    const b = { bb: 21 };
    const res0 = target.mergeMap<any>({}, { b: b });
    expect(res0.b).toBe(b);
    const res1 = target.mergeMap<any>({ b: b }, {});
    expect(res1.b).toBe(b);
    const res2 = target.mergeMap<any>({ b: b }, { b: b });
    expect(res2.b).not.toBe(b);
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

describe("mapEach", () => {
  test("should apply the operation for each item", () => {
    const result: any = [];
    target.mapEach(
      {
        id_a: { val: 1 },
        id_b: { val: 2 },
      },
      (obj, key) => result.push([key, obj.val]),
    );
    expect(result).toEqual([
      ["id_a", 1],
      ["id_b", 2],
    ]);
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

describe("findexSortFn", () => {
  test("should work as a sort function for objects having findex", () => {
    const a = { id: "a", findex: "Ay" };
    const b = { id: "b", findex: "Az" };
    const c = { id: "c", findex: "Ax" };
    expect([b, a, c].sort(target.findexSortFn)).toEqual([c, a, b]);
  });
});

describe("pickMinItem", () => {
  test("should return an item having minimum value", () => {
    const items = [
      { id: "a", value: 2 },
      { id: "b", value: 1 },
      { id: "c", value: 4 },
    ];
    expect(target.pickMinItem(items, (item) => item.value)).toEqual(items[1]);
  });
  test("should return undefined when there's no item", () => {
    expect(target.pickMinItem([], () => 0)).toEqual(undefined);
  });
});

describe("splitList", () => {
  test("should split list by checkFn", () => {
    expect(target.splitList([1, 2, 3, 4, 5], (n) => n < 3)).toEqual([
      [1, 2],
      [3, 4, 5],
    ]);
  });
});

describe("convertObjectToMap", () => {
  test("should convert Object to Map", () => {
    expect(target.convertObjectToMap({ a: { val: 1 }, b: { val: 2 } })).toEqual(
      new Map([
        ["a", { val: 1 }],
        ["b", { val: 2 }],
      ]),
    );
  });
});

describe("convertMapToObject", () => {
  test("should convert Map to Object", () => {
    expect(
      target.convertMapToObject(
        new Map([
          ["a", { val: 1 }],
          ["b", { val: 2 }],
        ]),
      ),
    ).toEqual({ a: { val: 1 }, b: { val: 2 } });
  });
});

describe("isObjectEmpty", () => {
  test("should return true when the object has no entry", () => {
    expect(target.isObjectEmpty({})).toBe(true);
    expect(target.isObjectEmpty({ a: 1 })).toBe(false);
    expect(target.isObjectEmpty({ a: undefined })).toBe(false);
  });
  test("When ignoreUndefined is true, should return true when the object has no defined entry", () => {
    expect(target.isObjectEmpty({}, true)).toBe(true);
    expect(target.isObjectEmpty({ a: 1 }, true)).toBe(false);
    expect(target.isObjectEmpty({ a: undefined }, true)).toBe(true);
    expect(target.isObjectEmpty({ a: undefined, b: 1 }, true)).toBe(false);
  });
});

describe("fillArray", () => {
  test("should return an array filled up to the count", () => {
    expect(target.fillArray(2, 0, [])).toEqual([0, 0]);
    expect(target.fillArray(3, undefined)).toEqual([undefined, undefined, undefined]);
    expect(target.fillArray(3, 0, [1, 2])).toEqual([1, 2, 0]);
  });
  test("should always return new array", () => {
    const arr = [1, 2];
    expect(target.fillArray(2, 0, arr)).not.toBe(arr);
  });
});

describe("slideSubArray", () => {
  test("should slide the sub array to the position", () => {
    const src = [0, 1, 2, 3, 4];
    expect(target.slideSubArray(src, [0, 2], -1)).toEqual([0, 1, 2, 3, 4]);
    expect(target.slideSubArray(src, [0, 2], 0)).toEqual([0, 1, 2, 3, 4]);
    expect(target.slideSubArray(src, [0, 2], 1)).toEqual([2, 0, 1, 3, 4]);
    expect(target.slideSubArray(src, [0, 2], 2)).toEqual([2, 3, 0, 1, 4]);
    expect(target.slideSubArray(src, [0, 2], 3)).toEqual([2, 3, 4, 0, 1]);
    expect(target.slideSubArray(src, [0, 2], 4)).toEqual([2, 3, 4, 0, 1]);
    expect(target.slideSubArray(src, [0, 2], 5)).toEqual([2, 3, 4, 0, 1]);

    expect(target.slideSubArray(src, [3, 2], -1)).toEqual([3, 4, 0, 1, 2]);
    expect(target.slideSubArray(src, [3, 2], 0)).toEqual([3, 4, 0, 1, 2]);
    expect(target.slideSubArray(src, [3, 2], 1)).toEqual([0, 3, 4, 1, 2]);
    expect(target.slideSubArray(src, [3, 2], 2)).toEqual([0, 1, 3, 4, 2]);
    expect(target.slideSubArray(src, [3, 2], 3)).toEqual([0, 1, 2, 3, 4]);
    expect(target.slideSubArray(src, [3, 2], 4)).toEqual([0, 1, 2, 3, 4]);
    expect(target.slideSubArray(src, [3, 2], 5)).toEqual([0, 1, 2, 3, 4]);

    expect(target.slideSubArray(src, [0, 3], 1)).toEqual([3, 0, 1, 2, 4]);
    expect(target.slideSubArray(src, [0, 3], 2)).toEqual([3, 4, 0, 1, 2]);
    expect(target.slideSubArray(src, [0, 3], 3)).toEqual([3, 4, 0, 1, 2]);
    expect(target.slideSubArray(src, [0, 3], 4)).toEqual([3, 4, 0, 1, 2]);
    expect(target.slideSubArray(src, [0, 3], 5)).toEqual([3, 4, 0, 1, 2]);
  });
});
