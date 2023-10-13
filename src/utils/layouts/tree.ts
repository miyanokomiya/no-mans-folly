import { Size } from "../../models";
import { groupBy, toMap } from "../commons";
import { TreeNode, getTree } from "../tree";
import { LayoutFn, LayoutNode } from "./core";

export const SIBLING_MARGIN = 30;
export const CHILD_MARGIN = 50;

export interface TreeLayoutNode extends LayoutNode {
  type: "root" | "node"; // root should be unique in a layout
  parentId: string;
  direction: 0 | 1 | 2 | 3; // top, right, bottom, left
}

export const treeLayout: LayoutFn<TreeLayoutNode> = (src) => {
  const srcMap = toMap(src);
  const treeRoot = getTree(src)[0];

  return src;
};

/**
 * Restriction: A tree can have either vertical or horizontal branches, but can't have both of them at the same time.
 */
export function getTreeBranchSizeMap(srcMap: { [id: string]: TreeLayoutNode }, treeRoot: TreeNode): Map<string, Size> {
  const branchSizeMap = new Map<string, Size>();

  const rootNode = srcMap[treeRoot.id];
  let rootW = rootNode.rect.width;
  let rootH = rootNode.rect.height;
  const grouped = groupBy(treeRoot.children, (c) => srcMap[c.id].direction);

  if (grouped["1"]) {
    const targets = grouped["1"];
    targets.forEach((t) => _getTreeBranchSize(branchSizeMap, srcMap, t));
    rootW += CHILD_MARGIN + Math.max(...targets.map((t) => branchSizeMap.get(t.id)!.width));
    rootH = Math.max(
      rootH,
      SIBLING_MARGIN * (targets.length - 1) +
        Array.from(targets).reduce((m, t) => m + branchSizeMap.get(t.id)!.height, 0),
    );
  }

  if (grouped["3"]) {
    const targets = grouped["3"];
    targets.forEach((t) => _getTreeBranchSize(branchSizeMap, srcMap, t));
    rootW += CHILD_MARGIN + Math.max(...targets.map((t) => branchSizeMap.get(t.id)!.width));
    rootH = Math.max(
      rootH,
      SIBLING_MARGIN * (targets.length - 1) +
        Array.from(targets).reduce((m, t) => m + branchSizeMap.get(t.id)!.height, 0),
    );
  }

  if (grouped["0"]) {
    const targets = grouped["0"];
    targets.forEach((t) => _getTreeBranchSize(branchSizeMap, srcMap, t));
    rootW = Math.max(
      rootH,
      SIBLING_MARGIN * (targets.length - 1) +
        Array.from(targets).reduce((m, t) => m + branchSizeMap.get(t.id)!.width, 0),
    );
    rootH += CHILD_MARGIN + Math.max(...targets.map((t) => branchSizeMap.get(t.id)!.height));
  }

  if (grouped["2"]) {
    const targets = grouped["2"];
    targets.forEach((t) => _getTreeBranchSize(branchSizeMap, srcMap, t));
    rootW = Math.max(
      rootH,
      SIBLING_MARGIN * (targets.length - 1) +
        Array.from(targets).reduce((m, t) => m + branchSizeMap.get(t.id)!.width, 0),
    );
    rootH += CHILD_MARGIN + Math.max(...targets.map((t) => branchSizeMap.get(t.id)!.height));
  }

  branchSizeMap.set(rootNode.id, { width: rootW, height: rootH });

  return branchSizeMap;
}

function _getTreeBranchSize(ret: Map<string, Size>, srcMap: { [id: string]: TreeLayoutNode }, treeNode: TreeNode) {
  const node = srcMap[treeNode.id];
  const horizontal = node.direction === 1 || node.direction === 3;
  let w = 0;
  let h = 0;
  treeNode.children.forEach((c) => {
    _getTreeBranchSize(ret, srcMap, c);
    const size = ret.get(c.id)!;
    if (horizontal) {
      w = Math.max(w, size.width);
      h += size.height;
    } else {
      w += size.width;
      h = Math.max(h, size.height);
    }
  });

  if (horizontal) {
    w += treeNode.children.length > 0 ? CHILD_MARGIN : 0;
    h += SIBLING_MARGIN * Math.max(0, treeNode.children.length - 1);
    ret.set(treeNode.id, { width: w + node.rect.width, height: Math.max(h, node.rect.height) });
  } else {
    w += SIBLING_MARGIN * Math.max(0, treeNode.children.length - 1);
    h += treeNode.children.length > 0 ? CHILD_MARGIN : 0;
    ret.set(treeNode.id, { width: Math.max(w, node.rect.width), height: h + node.rect.height });
  }
}
