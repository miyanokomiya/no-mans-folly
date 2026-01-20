import { add, IRectangle, IVec2 } from "okageo";
import { Entity } from "../../models";
import { TreeNode } from "../tree";

export interface LayoutNode extends Entity {
  rect: IRectangle;
}

export type LayoutFn<T extends LayoutNode> = (src: T[]) => T[];

export function toAbsoluteRectMap(
  nodeMap: Map<string, LayoutNode>,
  relativeMap: Map<string, IRectangle>,
  treeRoots: TreeNode[],
): Map<string, IRectangle> {
  const ret = new Map<string, IRectangle>();
  treeRoots.forEach((t) => {
    const node = nodeMap.get(t.id)!;
    toAbsoluteRectMapStep(ret, relativeMap, t, node.rect);
  });
  return ret;
}

function toAbsoluteRectMapStep(
  ret: Map<string, IRectangle>,
  relativeMap: Map<string, IRectangle>,
  treeNode: TreeNode,
  offset: IVec2,
) {
  const rect = relativeMap.get(treeNode.id)!;
  const newOffset = add(offset, rect);

  treeNode.children.forEach((c) => {
    toAbsoluteRectMapStep(ret, relativeMap, c, newOffset);
  });

  ret.set(treeNode.id, { ...rect, x: rect.x + offset.x, y: rect.y + offset.y });
}
