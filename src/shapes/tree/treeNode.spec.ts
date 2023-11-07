import { describe, test, expect } from "vitest";
import { getBoxAlignByDirection, struct } from "./treeNode";

describe("immigrateShapeIds", () => {
  test("should convert a shape to rectangle shape if a parent doesn't exist", () => {
    const shape = struct.create({ treeParentId: "a" });
    const result = struct.immigrateShapeIds!(shape, {});
    expect(result).toEqual({ type: "tree_root" });
    expect(result).toHaveProperty("direction");
    expect(result).toHaveProperty("treeParentId");
  });

  test("should immigrate tree parent if both tree parent and tree root exist", () => {
    const shape = struct.create({ treeParentId: "a", parentId: "p" });
    expect(struct.immigrateShapeIds!(shape, { a: "b" })).toEqual({ type: "tree_root" });
    expect(struct.immigrateShapeIds!(shape, { a: "b", p: "pp" })).toEqual({ treeParentId: "b" });
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
