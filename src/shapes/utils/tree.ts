import { toMap } from "../../utils/commons";
import { getTree, walkTree } from "../../utils/tree";
import { getPatchTreeRootShape, isTreeNodeShape, TreeNodeShape } from "../tree/treeNode";
import { isTreeRootShape, TreeRootShape } from "../tree/treeRoot";

export function patchByRegenerateTreeStructure(shapes: (TreeNodeShape | TreeRootShape)[]): {
  [id: string]: Partial<TreeNodeShape | TreeRootShape>;
} {
  const shapeMap = toMap(shapes);
  const treeNodes = getTree(
    shapes.map((s) =>
      isTreeNodeShape(s) ? { id: s.id, parentId: s.treeParentId } : { id: s.id, parentId: s.parentId },
    ),
  );
  const patch: { [id: string]: Partial<TreeNodeShape | TreeRootShape> } = {};
  treeNodes.forEach((root) => {
    const rootShape = shapeMap[root.id];
    if (!isTreeRootShape(rootShape)) {
      patch[root.id] = {
        parentId: undefined,
        treeParentId: undefined,
        ...getPatchTreeRootShape(),
      };
    }

    walkTree(root.children, (node) => {
      const shape = shapeMap[node.id];
      if (shape.parentId !== root.id) {
        patch[node.id] = { parentId: root.id };
      }
    });
  });

  return patch;
}
