import { describe, test, expect } from "vitest";
import { generateKeyBetweenAllowSame } from "./findex";
import { generateKeyBetween } from "fractional-indexing";

describe("generateKeyBetweenAllowSame", () => {
  test("should work like generateKeyBetween", () => {
    expect(generateKeyBetweenAllowSame("a0", "a1")).toBe(generateKeyBetween("a0", "a1"));
    expect(generateKeyBetweenAllowSame(null, "a1")).toBe(generateKeyBetween(null, "a1"));
    expect(generateKeyBetweenAllowSame("a0", null)).toBe(generateKeyBetween("a0", null));
    expect(generateKeyBetweenAllowSame(null, null)).toBe(generateKeyBetween(null, null));
  });

  test("should return the same findex when two arguments are same", () => {
    expect(generateKeyBetweenAllowSame("a0", "a0")).toBe("a0");
    expect(generateKeyBetweenAllowSame("a1", "a1")).toBe("a1");
  });
});
