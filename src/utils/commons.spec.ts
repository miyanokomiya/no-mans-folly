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
        "a"
      )
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
      ])
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
      })
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
        (d) => d.v === 0
      )
    ).toEqual({ id: "c", v: 0 });
  });
});
