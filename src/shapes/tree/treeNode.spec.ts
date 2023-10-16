import { describe, test, expect } from "vitest";
import { getBoxAlignByDirection, struct } from "./treeNode";

describe("immigrateShapeIds", () => {
  test("should convert a shape to rectangle shape if a parent doesn't exist", () => {
    const shape = struct.create({ treeParentId: "a" });
    const result = struct.immigrateShapeIds!(shape, {});
    expect(result).toEqual({ type: "rectangle" });
    expect(result).toHaveProperty("maxWidth");
    expect(result).toHaveProperty("direction");
    expect(result).toHaveProperty("treeParentId");
  });

  test("should immigrate tree parent if it exists", () => {
    const shape = struct.create({ treeParentId: "a" });
    expect(struct.immigrateShapeIds!(shape, { a: "b" })).toEqual({ treeParentId: "b" });
  });
});

describe("getBoxAlignByDirection", () => {
  test("should return appropriate box align for a direction", () => {
    expect(getBoxAlignByDirection(0)).toEqual({ vAlign: "bottom", hAlign: "center" });
    expect(getBoxAlignByDirection(1)).toEqual({ vAlign: "center", hAlign: "left" });
    expect(getBoxAlignByDirection(2)).toEqual({ vAlign: "top", hAlign: "center" });
    expect(getBoxAlignByDirection(3)).toEqual({ vAlign: "center", hAlign: "right" });
  });
});
