import { describe, test, expect } from "vitest";
import { getAssetSearchTag } from "./route";

describe("getAssetSearchTag", () => {
  test("should drop host and extention from the url", () => {
    expect(getAssetSearchTag("https://example.com/type/category/file.svg")).toBe("file");
    expect(getAssetSearchTag("https://example.com/type/category/file.folly.svg")).toBe("file");
    expect(getAssetSearchTag("https://example.com/type/category/File")).toBe("file");
    expect(getAssetSearchTag("https://example.com/type/category/dir/file.svg")).toBe("dir file");
    expect(getAssetSearchTag("https://example.com/type/category/dir1/dir2/file.svg")).toBe("dir1 dir2 file");
  });
});
