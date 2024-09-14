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

/**
 * Depth first ordered
 */
export function walkTree(treeNodes: TreeNode[], fn: (node: TreeNode, i: number) => void) {
  treeNodes.forEach((n, i) => walkTreeStep(n, fn, i));
}

function walkTreeStep(node: TreeNode, fn: (node: TreeNode, i: number) => void, i: number) {
  fn(node, i);
  node.children.forEach((c, j) => walkTreeStep(c, fn, j));
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

export function getBranchPath(nodeMap: { [id: string]: TreeNode }, targetId: string): string[] {
  const ret: string[] = [];

  let node: TreeNode | undefined = nodeMap[targetId];
  while (node) {
    ret.push(node.id);
    node = node.parentId ? nodeMap[node.parentId] : undefined;
  }

  return ret.reverse();
}
