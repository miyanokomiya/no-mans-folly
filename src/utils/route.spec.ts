import { describe, test, expect } from "vitest";
import { getAssetSearchTag } from "./route";

describe("getAssetSearchTag", () => {
  test("should drop host and extention from the url", () => {
    expect(getAssetSearchTag("https://example.com/assets/file.svg")).toBe("/assets/file");
    expect(getAssetSearchTag("https://example.com/assets/file.folly.svg")).toBe("/assets/file");
    expect(getAssetSearchTag("https://example.com/assets/File")).toBe("/assets/file");
  });
});
