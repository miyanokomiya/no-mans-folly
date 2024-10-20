import { describe, test, expect } from "vitest";
import { duplicateShapes } from "./duplicator";
import { createShape, getCommonStruct } from "..";
import { TreeRootShape } from "../tree/treeRoot";
import { generateKeyBetween } from "../../utils/findex";
import { TreeNodeShape } from "../tree/treeNode";

describe("duplicateShapes", () => {
  test("should preserve the structure of tree shapes", () => {
    const root = createShape<TreeRootShape>(getCommonStruct, "tree_root", {
      id: "root",
      findex: generateKeyBetween(null, null),
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
    });
    const a = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "a",
      findex: generateKeyBetween(root.findex, null),
      parentId: root.id,
      treeParentId: root.id,
      p: { x: 50, y: -50 },
      width: 10,
      height: 10,
      direction: 1,
    });
    const aa = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
      id: "aa",
      findex: generateKeyBetween(a.findex, null),
      parentId: root.id,
      treeParentId: a.id,
      p: { x: 100, y: -50 },
      width: 10,
      height: 10,
      direction: 1,
    });

    let count = 0;
    const generateUuid = () => {
      count++;
      return `id_${count}`;
    };

    {
      const result0 = duplicateShapes(
        getCommonStruct,
        [a, aa],
        [],
        generateUuid,
        generateKeyBetween(aa.findex, null),
        new Set([root.id, a.id, aa.id]),
      );
      expect(result0.shapes).toHaveLength(2);
      expect(result0.shapes[0].type).toBe(root.type);
      expect(result0.shapes[0].parentId).toBe(undefined);
      expect((result0.shapes[0] as TreeNodeShape).treeParentId).toBe(undefined);
      expect(result0.shapes[1].type).toBe(aa.type);
      expect(result0.shapes[1].parentId).toBe(result0.shapes[0].id);
      expect((result0.shapes[1] as TreeNodeShape).treeParentId).toBe(result0.shapes[0].id);
    }

    {
      const result1 = duplicateShapes(
        getCommonStruct,
        [root, aa],
        [],
        generateUuid,
        generateKeyBetween(aa.findex, null),
        new Set([root.id, a.id, aa.id]),
      );
      expect(result1.shapes).toHaveLength(2);
      expect(result1.shapes[0].type).toBe(root.type);
      expect(result1.shapes[0].parentId).toBe(undefined);
      expect((result1.shapes[0] as TreeNodeShape).treeParentId).toBe(undefined);
      expect(result1.shapes[1].type).toBe(root.type);
      expect(result1.shapes[1].parentId).toBe(undefined);
      expect((result1.shapes[1] as TreeNodeShape).treeParentId).toBe(undefined);
    }
  });
});
