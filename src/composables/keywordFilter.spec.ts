import { describe, test, expect } from "vitest";
import { newKeywordFilter } from "./keywordFilter";

describe("newKeywordFilter", () => {
  test("should return hit result", () => {
    const filterFn = newKeywordFilter({ keyword: "abc" });
    expect(filterFn(["a", "ab", "abc", "dabcf"], (v) => v)).toEqual({
      result: ["abc", "dabcf"],
      remaind: false,
    });

    expect(filterFn(new Set(["a", "ab", "abc", "dabcf"]), (v) => v)).toEqual({
      result: ["abc", "dabcf"],
      remaind: false,
    });
  });

  test("should split keyword and check them all", () => {
    const filterFn = newKeywordFilter({ keyword: "c b a" });
    expect(filterFn(["a", "ab", "abc", "dabcf"], (v) => v)).toEqual({
      result: ["abc", "dabcf"],
      remaind: false,
    });
  });

  test("should limit maximum hit size", () => {
    const filterFn = newKeywordFilter({ keyword: "a", maxHit: 2 });
    expect(filterFn(["a", "ab", "abc", "dabcf"], (v) => v)).toEqual({
      result: ["a", "ab"],
      remaind: true,
    });
  });
});
