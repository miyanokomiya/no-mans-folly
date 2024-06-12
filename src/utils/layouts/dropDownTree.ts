import { IVec2 } from "okageo";
import { Size } from "../../models";
import { groupBy, toMap } from "../commons";
import { TreeNode, getTree, walkTree } from "../tree";
import { LayoutFn } from "./core";
import { CHILD_MARGIN, SIBLING_MARGIN, TreeLayoutNode, getSiblingHeightMap, getSiblingWidthMap } from "./tree";

export const dropDownTreeLayout: LayoutFn<TreeLayoutNode> = (src) => {
  const srcMap = toMap(src);
  const trees = getTree(src);
  if (trees.length !== 1) {
    console.warn(`Tree layout should have single root, but detected ${trees.length}.`);
    return src;
  }

  const treeRoot = trees[0];
  const rootSrc = srcMap[treeRoot.id];
  const siblingMargin = rootSrc.siblingMargin ?? SIBLING_MARGIN;
  const childMargin = rootSrc.childMargin ?? CHILD_MARGIN;
  const positionMap = getTreeBranchPositionMap(
    srcMap,
    treeRoot,
    getTreeBranchSizeMap(srcMap, treeRoot, siblingMargin, childMargin),
    siblingMargin,
    childMargin,
  );

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

    if (top.length > 0) {
      const localRoot = { ...treeRoot, children: top };
      getChildrenBranchPositionMapRight(positionMap, srcMap, localRoot, sizeMap, siblingMargin, childMargin);
      const originY = rootNode.rect.y + rootNode.rect.height / 2;
      const siblingHeightMap = new Map<string, number>();
      getSiblingHeightMap(siblingHeightMap, srcMap, localRoot);
      walkTree(top, (t) => {
        if (!t.parentId) return;

        const p = positionMap.get(t.id)!;
        positionMap.set(t.id, { x: p.x, y: 2 * originY - p.y - srcMap[t.id].rect.height });
      });
    }
    if (bottom.length > 0) {
      getChildrenBranchPositionMapRight(
        positionMap,
        srcMap,
        { ...treeRoot, children: bottom },
        sizeMap,
        siblingMargin,
        childMargin,
      );
    }
  }

  if (grouped["3"]) {
    const targets = grouped["3"];
    const top: TreeNode[] = [];
    const bottom: TreeNode[] = [];
    targets.forEach((t) => (srcMap[t.id].dropdown === 0 ? top.push(t) : bottom.push(t)));

    if (top.length > 0) {
      const localRoot = { ...treeRoot, children: top };
      getChildrenBranchPositionMapRight(positionMap, srcMap, localRoot, sizeMap, siblingMargin, childMargin);
      const originX = rootNode.rect.x + rootNode.rect.width / 2;
      const siblingWidthMap = new Map<string, number>();
      getSiblingWidthMap(siblingWidthMap, srcMap, localRoot);
      const originY = rootNode.rect.y + rootNode.rect.height / 2;
      const siblingHeightMap = new Map<string, number>();
      getSiblingHeightMap(siblingHeightMap, srcMap, localRoot);
      walkTree(top, (t) => {
        if (!t.parentId) return;

        const p = positionMap.get(t.id)!;
        const siblingWidth = siblingWidthMap.get(t.parentId)!;
        const wGap = siblingWidth - srcMap[t.id].rect.width;
        positionMap.set(t.id, {
          x: 2 * originX - p.x - siblingWidth + wGap,
          y: 2 * originY - p.y - srcMap[t.id].rect.height,
        });
      });
    }
    if (bottom.length > 0) {
      const localRoot = { ...treeRoot, children: bottom };
      getChildrenBranchPositionMapRight(positionMap, srcMap, localRoot, sizeMap, siblingMargin, childMargin);
      const originX = rootNode.rect.x + rootNode.rect.width / 2;
      const siblingWidthMap = new Map<string, number>();
      getSiblingWidthMap(siblingWidthMap, srcMap, localRoot);
      walkTree(bottom, (t) => {
        if (!t.parentId) return;

        const p = positionMap.get(t.id)!;
        const siblingWidth = siblingWidthMap.get(t.parentId)!;
        // Align to right in the sinblings
        const wGap = siblingWidth - srcMap[t.id].rect.width;
        positionMap.set(t.id, { x: 2 * originX - p.x - siblingWidth + wGap, y: p.y });
      });
    }
  }

  return positionMap;
}

function getChildrenBranchPositionMapRight(
  ret: Map<string, IVec2>,
  srcMap: { [id: string]: TreeLayoutNode },
  treeNode: TreeNode,
  sizeMap: Map<string, Size>,
  siblingMargin: number,
  childMargin: number,
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

  const targets = treeRoot.children;
  targets.forEach((t) => _getTreeBranchSize(branchSizeMap, srcMap, t, siblingMargin, childMargin));
  rootW = Math.max(rootW, rootW / 2 + childMargin + Math.max(...targets.map((t) => branchSizeMap.get(t.id)!.width)));
  rootH =
    siblingMargin * (targets.length - 1) + Array.from(targets).reduce((m, t) => m + branchSizeMap.get(t.id)!.height, 0);

  branchSizeMap.set(rootNode.id, { width: rootW, height: rootH });

  return branchSizeMap;
}

function _getTreeBranchSize(
  ret: Map<string, Size>,
  srcMap: { [id: string]: TreeLayoutNode },
  treeNode: TreeNode,
  siblingMargin: number,
  childMargin: number,
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
