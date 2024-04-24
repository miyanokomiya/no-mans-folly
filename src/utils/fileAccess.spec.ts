import { describe, test, expect } from "vitest";
import { isFollySheetFileName } from "./fileAccess";

describe("isFollySheetFileName", () => {
  test("should return true when the name is for a folly sheet", () => {
    expect(isFollySheetFileName("")).toBe(false);
    expect(isFollySheetFileName("a")).toBe(false);
    expect(isFollySheetFileName("a.folly")).toBe(true);
    expect(isFollySheetFileName("aBc.folly")).toBe(true);
    expect(isFollySheetFileName("A.FOLLY"), "should lower the name before calling").toBe(false);
    expect(isFollySheetFileName("diagram.folly"), "should exclude folly diagram file name").toBe(false);
  });
});
