import { IVec2 } from "okageo";
import { Size } from "../../models";
import { groupBy, toMap } from "../commons";
import { TreeNode, getTree } from "../tree";
import { LayoutFn } from "./core";
import { TreeLayoutNode } from "./tree";

export const SIBLING_MARGIN = 30;
export const CHILD_MARGIN = 50;

export const dropDownTreeLayout: LayoutFn<TreeLayoutNode> = (src) => {
  const srcMap = toMap(src);
  const trees = getTree(src);
  if (trees.length !== 1) {
    console.warn(`Tree layout should have single root, but detected ${trees.length}.`);
    return src;
  }

  const treeRoot = trees[0];
  const positionMap = getTreeBranchPositionMap(srcMap, treeRoot, getTreeBranchSizeMap(srcMap, treeRoot));

  return src.map((s) => {
    const p = positionMap.get(s.id);
    if (p) {
      return { ...s, rect: { ...p, width: s.rect.width, height: s.rect.height } };
    } else {
      return s;
    }
  });
};

export function getTreeBranchPositionMap(
  srcMap: { [id: string]: TreeLayoutNode },
  treeRoot: TreeNode,
  sizeMap: Map<string, Size>,
  siblingMargin = SIBLING_MARGIN,
  childMargin = CHILD_MARGIN,
): Map<string, IVec2> {
  const rootNode = srcMap[treeRoot.id];
  const positionMap = new Map<string, IVec2>([[rootNode.id, { x: rootNode.rect.x, y: rootNode.rect.y }]]);
  const grouped = groupBy(treeRoot.children, (c) => srcMap[c.id].direction);

  if (grouped["1"]) {
    const targets = grouped["1"];
    const top: TreeNode[] = [];
    const bottom: TreeNode[] = [];
    targets.forEach((t) => (srcMap[t.id].dropdown === 0 ? top.push(t) : bottom.push(t)));
    getChildrenBranchPositionMapRight(
      positionMap,
      srcMap,
      { ...treeRoot, children: bottom },
      sizeMap,
      siblingMargin,
      childMargin,
    );
  }

  return positionMap;
}

function getChildrenBranchPositionMapRight(
  ret: Map<string, IVec2>,
  srcMap: { [id: string]: TreeLayoutNode },
  treeNode: TreeNode,
  sizeMap: Map<string, Size>,
  siblingMargin = SIBLING_MARGIN,
  childMargin = CHILD_MARGIN,
) {
  const nodeSize = srcMap[treeNode.id].rect;
  const nodeP = ret.get(treeNode.id)!;
  const x = nodeP.x + nodeSize.width / 2 + childMargin;
  let y = nodeP.y + nodeSize.height + siblingMargin;
  treeNode.children.forEach((c) => {
    const childBranchSize = sizeMap.get(c.id)!;
    ret.set(c.id, { x, y });
    y += childBranchSize.height + siblingMargin;
  });

  treeNode.children.forEach((c) => {
    getChildrenBranchPositionMapRight(ret, srcMap, c, sizeMap, siblingMargin, childMargin);
  });
}

/**
 * Restriction: A tree can have either vertical or horizontal branches, but can't have both of them at the same time.
 */
export function getTreeBranchSizeMap(
  srcMap: { [id: string]: TreeLayoutNode },
  treeRoot: TreeNode,
  siblingMargin = SIBLING_MARGIN,
  childMargin = CHILD_MARGIN,
): Map<string, Size> {
  const branchSizeMap = new Map<string, Size>();

  const rootNode = srcMap[treeRoot.id];
  let rootW = rootNode.rect.width;
  let rootH = rootNode.rect.height;
  const grouped = groupBy(treeRoot.children, (c) => srcMap[c.id].dropdown ?? 2);

  if (grouped["2"]) {
    const targets = grouped["2"];
    targets.forEach((t) => _getTreeBranchSize(branchSizeMap, srcMap, t, siblingMargin, childMargin));
    rootW = Math.max(rootW, rootW / 2 + childMargin + Math.max(...targets.map((t) => branchSizeMap.get(t.id)!.width)));
    rootH =
      siblingMargin * (targets.length - 1) +
      Array.from(targets).reduce((m, t) => m + branchSizeMap.get(t.id)!.height, 0);
  }

  branchSizeMap.set(rootNode.id, { width: rootW, height: rootH });

  return branchSizeMap;
}

function _getTreeBranchSize(
  ret: Map<string, Size>,
  srcMap: { [id: string]: TreeLayoutNode },
  treeNode: TreeNode,
  siblingMargin = SIBLING_MARGIN,
  childMargin = CHILD_MARGIN,
) {
  const node = srcMap[treeNode.id];
  const horizontal = node.direction === 1 || node.direction === 3;
  let w = 0;
  let h = 0;
  treeNode.children.forEach((c) => {
    _getTreeBranchSize(ret, srcMap, c, siblingMargin, childMargin);
    const size = ret.get(c.id)!;
    if (horizontal) {
      w = Math.max(w, size.width);
      h += size.height;
    }
  });

  if (horizontal) {
    w += treeNode.children.length > 0 ? node.rect.width / 2 + childMargin : node.rect.width;
    h += siblingMargin * Math.max(0, treeNode.children.length) + node.rect.height;
    ret.set(treeNode.id, { width: w, height: h });
  }
}
