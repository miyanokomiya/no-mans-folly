import { describe, test, expect } from "vitest";
import { generateSimpleIntegerHash } from "./hash";

describe("generateSimpleIntegerHash", () => {
  test("should return interger hash", () => {
    const res0 = generateSimpleIntegerHash("abc");
    const res1 = generateSimpleIntegerHash("def");
    expect(res0).not.toBe(res1);
    expect(res0).toBe(generateSimpleIntegerHash("abc"));
  });
});
