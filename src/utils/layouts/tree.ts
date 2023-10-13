import { IVec2 } from "okageo";
import { Direction4, Size } from "../../models";
import { groupBy, toMap } from "../commons";
import { TreeNode, getTree, walkTree } from "../tree";
import { LayoutFn, LayoutNode } from "./core";
import { getWrapperRect } from "../geometry";

export const SIBLING_MARGIN = 30;
export const CHILD_MARGIN = 50;

export interface TreeLayoutNode extends LayoutNode {
  type: "root" | "node"; // root should be unique in a layout
  parentId: string;
  direction: Direction4;
}

export const treeLayout: LayoutFn<TreeLayoutNode> = (src) => {
  const srcMap = toMap(src);
  const treeRoot = getTree(src)[0];
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
    getChildrenBranchPositionMapRight(
      positionMap,
      srcMap,
      { ...treeRoot, children: targets },
      sizeMap,
      siblingMargin,
      childMargin,
    );
  }

  if (grouped["3"]) {
    const targets = grouped["3"];
    getChildrenBranchPositionMapRight(
      positionMap,
      srcMap,
      { ...treeRoot, children: targets },
      sizeMap,
      siblingMargin,
      childMargin,
    );
    const originX = rootNode.rect.x;
    const siblingSizeMap = new Map<string, Size>();
    getSiblingSizeMap(siblingSizeMap, srcMap, treeRoot);
    walkTree(targets, (t) => {
      if (!t.parentId) return;

      const p = positionMap.get(t.id)!;
      positionMap.set(t.id, { x: originX - (p.x - originX) - siblingSizeMap.get(t.parentId)!.width, y: p.y });
    });
  }

  return positionMap;
}

function getSiblingSizeMap(ret: Map<string, Size>, srcMap: { [id: string]: TreeLayoutNode }, rootNode: TreeNode) {
  walkTree([rootNode], (t) => {
    if (t.children.length === 0) return;

    // TODO: Consider gap between nodes
    const rect = getWrapperRect(t.children.map((c) => srcMap[c.id].rect));
    ret.set(t.id, { width: rect.width, height: rect.height });
    t.children.forEach((c) => getSiblingSizeMap(ret, srcMap, c));
  });
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
  const siblingBranchHeight =
    treeNode.children.reduce((m, c) => m + sizeMap.get(c.id)!.height, 0) +
    Math.max(0, treeNode.children.length - 1) * siblingMargin;
  const nodeP = ret.get(treeNode.id)!;
  const x = nodeP.x + nodeSize.width + childMargin;
  let y = nodeP.y + nodeSize.height / 2 - siblingBranchHeight / 2;
  treeNode.children.forEach((c) => {
    const childSize = srcMap[c.id].rect;
    const childBranchSize = sizeMap.get(c.id)!;
    ret.set(c.id, { x, y: y + childBranchSize.height / 2 - childSize.height / 2 });
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
  const grouped = groupBy(treeRoot.children, (c) => srcMap[c.id].direction);

  if (grouped["1"]) {
    const targets = grouped["1"];
    targets.forEach((t) => _getTreeBranchSize(branchSizeMap, srcMap, t, siblingMargin, childMargin));
    rootW += childMargin + Math.max(...targets.map((t) => branchSizeMap.get(t.id)!.width));
    rootH = Math.max(
      rootH,
      siblingMargin * (targets.length - 1) +
        Array.from(targets).reduce((m, t) => m + branchSizeMap.get(t.id)!.height, 0),
    );
  }

  if (grouped["3"]) {
    const targets = grouped["3"];
    targets.forEach((t) => _getTreeBranchSize(branchSizeMap, srcMap, t, siblingMargin, childMargin));
    rootW += childMargin + Math.max(...targets.map((t) => branchSizeMap.get(t.id)!.width));
    rootH = Math.max(
      rootH,
      siblingMargin * (targets.length - 1) +
        Array.from(targets).reduce((m, t) => m + branchSizeMap.get(t.id)!.height, 0),
    );
  }

  if (grouped["0"]) {
    const targets = grouped["0"];
    targets.forEach((t) => _getTreeBranchSize(branchSizeMap, srcMap, t, siblingMargin, childMargin));
    rootW = Math.max(
      rootH,
      siblingMargin * (targets.length - 1) +
        Array.from(targets).reduce((m, t) => m + branchSizeMap.get(t.id)!.width, 0),
    );
    rootH += childMargin + Math.max(...targets.map((t) => branchSizeMap.get(t.id)!.height));
  }

  if (grouped["2"]) {
    const targets = grouped["2"];
    targets.forEach((t) => _getTreeBranchSize(branchSizeMap, srcMap, t, siblingMargin, childMargin));
    rootW = Math.max(
      rootH,
      siblingMargin * (targets.length - 1) +
        Array.from(targets).reduce((m, t) => m + branchSizeMap.get(t.id)!.width, 0),
    );
    rootH += childMargin + Math.max(...targets.map((t) => branchSizeMap.get(t.id)!.height));
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
    } else {
      w += size.width;
      h = Math.max(h, size.height);
    }
  });

  if (horizontal) {
    w += treeNode.children.length > 0 ? childMargin : 0;
    h += siblingMargin * Math.max(0, treeNode.children.length - 1);
    ret.set(treeNode.id, { width: w + node.rect.width, height: Math.max(h, node.rect.height) });
  } else {
    w += siblingMargin * Math.max(0, treeNode.children.length - 1);
    h += treeNode.children.length > 0 ? childMargin : 0;
    ret.set(treeNode.id, { width: Math.max(w, node.rect.width), height: h + node.rect.height });
  }
}
