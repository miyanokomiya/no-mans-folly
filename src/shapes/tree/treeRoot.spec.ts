import { describe, test, expect } from "vitest";
import { createShape, getCommonStruct } from "..";
import { TreeNodeShape } from "./treeNode";
import { newShapeComposite } from "../../composables/shapeComposite";
import { TreeRootShape } from "./treeRoot";

describe("getRectPolygonForLayout", () => {
  const root = createShape<TreeRootShape>(getCommonStruct, "tree_root", { id: "a", width: 100, height: 100 });
  const node0 = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
    id: "node0",
    parentId: root.id,
    treeParentId: root.id,
    p: { x: 200, y: 100 },
    width: 100,
    height: 100,
  });

  test("should return rectangle polygon accommodating all children", () => {
    const shapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [root, node0],
    });
    const result0 = shapeComposite.getRectPolygonForLayout(root);
    expect(result0).toEqualPoints([
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 200 },
      { x: 0, y: 200 },
    ]);
  });

  test("should regard rotation of the root shape", () => {
    const rotated = { ...root, rotation: Math.PI / 2 };
    const shapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [rotated, node0],
    });
    const result0 = shapeComposite.getRectPolygonForLayout(rotated);
    expect(result0).toEqualPoints([
      { x: 300, y: 0 },
      { x: 300, y: 200 },
      { x: 0, y: 200 },
      { x: 0, y: 0 },
    ]);
  });
});
