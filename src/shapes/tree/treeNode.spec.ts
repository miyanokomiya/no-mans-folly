import { describe, test, expect } from "vitest";
import { struct } from "./treeNode";

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
