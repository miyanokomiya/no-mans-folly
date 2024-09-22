import { describe, test, expect } from "vitest";
import { generateKeyBetweenAllowSame, generateKeyBetween, generateNKeysBetween } from "./findex";

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

describe("generateKeyBetween", () => {
  test("should return findex between arguments", () => {
    const i0 = generateKeyBetween(null, null);
    const i1 = generateKeyBetween(i0, null);
    expect(i1 < generateKeyBetween(i1, null)).toBe(true);
    expect(generateKeyBetween(null, i1) < i1).toBe(true);
    expect(i0 < generateKeyBetween(i0, i1)).toBe(true);
    expect(generateKeyBetween(i0, i1) < i1).toBe(true);
  });
});

describe("generateNKeysBetween", () => {
  test("should return findex list between arguments", () => {
    const i0 = generateKeyBetween(null, null);
    const i1 = generateKeyBetween(i0, null);
    const lsit = generateNKeysBetween(i0, i1, 3);
    expect(lsit).toHaveLength(3);
    expect(i0 < lsit[0]).toBe(true);
    expect(lsit[0] < lsit[1]).toBe(true);
    expect(lsit[1] < lsit[2]).toBe(true);
    expect(lsit[2] < i1).toBe(true);
  });
});
