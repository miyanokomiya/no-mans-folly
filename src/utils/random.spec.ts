import { expect, describe, test } from "vitest";
import { generateUuid } from "./random";

describe("generateUuid", () => {
  test("should return uuid", () => {
    const set = new Set([generateUuid(), generateUuid(), generateUuid(), generateUuid(), generateUuid()]);
    expect(set.size).toBe(5);
  });

  test("should avoid number prefix", () => {
    expect(/^[0-9]/.test(generateUuid())).toBe(false);
  });
});
