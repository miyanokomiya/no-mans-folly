import { mapEach } from "./commons";

export interface TreeFlatNode {
  id: string;
  parentId?: string;
}

export interface TreeNode {
  id: string;
  parentId?: string;
  children: TreeNode[];
}

export function getTree<T extends TreeFlatNode>(items: T[]): TreeNode[] {
  const parentRefMap = getParentRefMap(items);
  const noParentIds: string[] = [];
  const parentMap: { [id: string]: T[] } = {};

  for (const item of items) {
    const parentId = parentRefMap.get(item.id);
    if (!parentId) {
      noParentIds.push(item.id);
    } else if (parentMap[parentId]) {
      parentMap[parentId].push(item);
    } else {
      parentMap[parentId] = [item];
    }
  }

  return noParentIds.map((id) => {
    return { id, children: getChildNodes(parentMap, id) };
  });
}

/**
 * Circular parent references are severed but the result will be unstable.
 */
export function getParentRefMap(items: TreeFlatNode[]): Map<string, string> {
  const parentMap: Map<string, string> = new Map();
  const checkedSet: Set<string> = new Set();
  const itemMap = new Map(items.map((item) => [item.id, item]));

  items.forEach((item) => {
    if (checkedSet.has(item.id)) return;

    const route = new Set<string>();
    let current: TreeFlatNode | undefined = item;
    while (current) {
      if (checkedSet.has(current.id)) break;
      checkedSet.add(current.id);

      if (current.parentId && itemMap.has(current.parentId) && !route.has(current.parentId)) {
        parentMap.set(current.id, current.parentId);
        route.add(current.id);
        current = itemMap.get(current.parentId);
      } else {
        current = undefined;
      }
    }
  });

  return parentMap;
}

function getChildNodes<T extends TreeFlatNode>(parentMap: { [id: string]: T[] }, parentId: string): TreeNode[] {
  return (
    parentMap[parentId]?.map((b) => {
      return { id: b.id, parentId: b.parentId, children: getChildNodes(parentMap, b.id) };
    }) ?? []
  );
}

type TreeWalkOptions = {
  onDown?: (parent: TreeNode) => void;
  onUp?: (parent: TreeNode) => void;
};

/**
 * Depth first ordered
 */
export function walkTree(treeNodes: TreeNode[], fn: (node: TreeNode, i: number) => void, options?: TreeWalkOptions) {
  treeNodes.forEach((n, i) => walkTreeStep(n, fn, i, options));
}

function walkTreeStep(node: TreeNode, fn: (node: TreeNode, i: number) => void, i: number, options?: TreeWalkOptions) {
  fn(node, i);
  if (node.children.length > 0) {
    options?.onDown?.(node);
    node.children.forEach((c, j) => walkTreeStep(c, fn, j, options));
    options?.onUp?.(node);
  }
}

export function walkTreeWithValue<T>(treeNodes: TreeNode[], fn: (node: TreeNode, i: number, t: T) => T, t: T) {
  treeNodes.forEach((n, i) => walkTreeStepWithValue(n, fn, i, t));
}

function walkTreeStepWithValue<T>(node: TreeNode, fn: (node: TreeNode, i: number, t: T) => T, i: number, t: T) {
  const nextVal = fn(node, i, t);
  node.children.forEach((c, j) => walkTreeStepWithValue(c, fn, j, nextVal));
}

/**
 * Depth first ordered
 */
export function flatTree(nodes: TreeNode[]): TreeNode[] {
  const ret = new Set<TreeNode>();
  _flatTreeByDepth(nodes, ret);
  return Array.from(ret);
}

function _flatTreeByDepth(nodes: TreeNode[], ret: Set<TreeNode>) {
  nodes.forEach((n) => {
    ret.add(n);
    _flatTreeByDepth(n.children, ret);
  });
}

/**
 * Depth first ordered
 */
export function getAllBranchIds(allNodes: TreeNode[], targetIds: string[]): string[] {
  const idSet = new Set(targetIds);
  const retIdSet = new Set<string>();
  flatTree(flatTree(allNodes).filter((t) => idSet.has(t.id))).forEach((t) => {
    retIdSet.add(t.id);
  });
  return Array.from(retIdSet);
}

export function getAllBranchIdsByMap(treeNodeMap: { [id: string]: TreeNode }, targetIds: string[]): string[] {
  const idSet = new Set(targetIds);
  const retIdSet = new Set<string>();
  mapEach(treeNodeMap, (n, id) => {
    if (idSet.has(id)) {
      flatTree([n]).forEach((nn) => retIdSet.add(nn.id));
    }
  });
  return Array.from(retIdSet);
}

/**
 * Returns [root, ..., parent, targetId]
 */
export function getBranchPath(nodeMap: { [id: string]: TreeNode }, targetId: string): string[] {
  const ret: string[] = [];

  let node: TreeNode | undefined = nodeMap[targetId];
  while (node) {
    ret.unshift(node.id);
    node = node.parentId ? nodeMap[node.parentId] : undefined;
  }

  return ret;
}

/**
 * Pick top nodes in the given IDs as root ones
 * e.g. When a child and its parent are in "ids", pick the parent only.
 */
export function getTopNodeIds(nodeMap: { [id: string]: TreeNode }, targetIds: string[]): string[] {
  const idSet = new Set(targetIds);
  return targetIds.filter((id) => {
    const branchPath = getBranchPath(nodeMap, id);
    branchPath.pop();
    return branchPath.every((a) => !idSet.has(a));
  });
}
