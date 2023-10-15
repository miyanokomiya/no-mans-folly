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
  const noParents: T[] = [];
  const itemMap = new Map(items.map((item) => [item.id, item]));

  const parentMap: { [id: string]: T[] } = items.reduce<{ [id: string]: T[] }>((p, b) => {
    if (!b.parentId || !itemMap.has(b.parentId)) {
      noParents.push(b);
    } else if (p[b.parentId]) {
      p[b.parentId].push(b);
    } else {
      p[b.parentId] = [b];
    }
    return p;
  }, {});

  return noParents.map((b) => {
    return { id: b.id, children: getChildNodes(parentMap, b.id) };
  });
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
export function walkTree(treeNodes: TreeNode[], fn: (node: TreeNode) => void) {
  treeNodes.forEach((n) => walkTreeStep(n, fn));
}

function walkTreeStep(node: TreeNode, fn: (node: TreeNode) => void) {
  fn(node);
  node.children.forEach((c) => walkTreeStep(c, fn));
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
