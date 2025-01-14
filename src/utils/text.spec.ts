import { describe, test, expect } from "vitest";
import { addSuffixToAvoidDuplication } from "./text";

describe("addSuffixToAvoidDuplication", () => {
  test("should add suffix to avoid duplication", () => {
    expect(addSuffixToAvoidDuplication(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(addSuffixToAvoidDuplication(["a", "a", "a"])).toEqual(["a", "a(1)", "a(2)"]);
    expect(addSuffixToAvoidDuplication(["a", "b", "a", "b"])).toEqual(["a", "b", "a(1)", "b(1)"]);
  });
});
