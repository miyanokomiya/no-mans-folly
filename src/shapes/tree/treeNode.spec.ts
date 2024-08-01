import { describe, test, expect } from "vitest";
import { getBoxAlignByDirection, struct } from "./treeNode";

describe("immigrateShapeIds", () => {
  test("should convert a shape to rectangle shape if a parent doesn't exist", () => {
    const shape = struct.create({ treeParentId: "a" });
    const result0 = struct.immigrateShapeIds!(shape, {}, true);
    expect(result0).toEqual({ type: "tree_root" });
    expect(result0).toHaveProperty("direction");
    expect(result0).toHaveProperty("treeParentId");
  });

  test("should keep current relations if a parent doesn't exist but removeNotFound is true", () => {
    const shape = struct.create({ treeParentId: "a" });
    expect(struct.immigrateShapeIds!(shape, {})).toEqual({});
  });

  test("should immigrate tree parent if both tree parent and tree root exist", () => {
    const shape = struct.create({ treeParentId: "a", parentId: "p" });
    expect(struct.immigrateShapeIds!(shape, { a: "b" }, true)).toEqual({ type: "tree_root" });
    expect(struct.immigrateShapeIds!(shape, { a: "b", p: "pp" }, true)).toEqual({ treeParentId: "b" });
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
