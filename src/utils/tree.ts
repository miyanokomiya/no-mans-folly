interface TreeFlatNode {
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
    return { ...b, children: getChildNodes(parentMap, b.id) };
  });
}

function getChildNodes<T extends TreeFlatNode>(parentMap: { [id: string]: T[] }, parentId: string): TreeNode[] {
  return (
    parentMap[parentId]?.map((b) => {
      return { ...b, children: getChildNodes(parentMap, b.id) };
    }) ?? []
  );
}

export function walkTree(treeNodes: TreeNode[], fn: (node: TreeNode) => void) {
  treeNodes.forEach((n) => walkTreeStep(n, fn));
}

function walkTreeStep(node: TreeNode, fn: (node: TreeNode) => void) {
  fn(node);
  node.children.forEach((c) => walkTreeStep(c, fn));
}
