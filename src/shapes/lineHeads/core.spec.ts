import { describe, test, expect } from "vitest";
import { getHeadBaseHeight } from "./core";

describe("getHeadBaseHeight", () => {
  test("should return base height", () => {
    expect(getHeadBaseHeight(3)).toBe(18);
    expect(getHeadBaseHeight(3, 0)).toBe(0);
    expect(getHeadBaseHeight(3, 2)).toBe(6);
    expect(getHeadBaseHeight(3, 4)).toBe(12);
  });
});
