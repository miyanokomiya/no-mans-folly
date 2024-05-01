import { describe, test, expect } from "vitest";
import { blobToBase64, getBase64Type, isFollySheetFileName } from "./fileAccess";

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

describe("blobToBase64", () => {
  test("should return base64 of the blob: without URI", async () => {
    const res = await blobToBase64(new Blob(["test"], { type: "image/svg+xml" }));
    expect(res).not.toBe("");
    expect(res.startsWith("data:image/svg+xml;base64,")).toBe(false);
  });

  test("should return base64 of the blob: with URI", async () => {
    const res = await blobToBase64(new Blob(["test"], { type: "image/svg+xml" }), true);
    expect(res.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });
});

describe("getBase64Type", () => {
  test("should return the type", () => {
    expect(getBase64Type("data:image/png;base64,iVB")).toBe("image/png");
    expect(getBase64Type("data:image/svg+xml;base64,iVB")).toBe("image/svg+xml");
  });

  test("should return application/octet-stream when the type is unknown", () => {
    expect(getBase64Type("iVB")).toBe("application/octet-stream");
  });
});
