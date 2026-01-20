import { IRectangle, IVec2 } from "okageo";
import { getTree, TreeNode } from "../tree";
import { LayoutFn, LayoutNode, toAbsoluteRectMap } from "./core";

export type TableLayoutNode = TableLayoutBox | TableLayoutEntity;

type Coords = [rowId: string, columnId: string];

interface TableLayoutBase extends LayoutNode {
  parentId?: string;
  coords?: Coords;
}

export interface TableLayoutEntity extends TableLayoutBase {
  type: "entity";
  coords: Coords;
}

type TableLayoutColumn = { id: string; size: number };
type TableLayoutRow = { id: string; size: number };

export interface TableLayoutBox extends TableLayoutBase {
  type: "box";
  columns: TableLayoutColumn[];
  rows: TableLayoutRow[];
}

export const tableLayout: LayoutFn<TableLayoutNode> = (src) => {
  const nodeMap = new Map(src.map((n) => [n.id, n]));
  const treeRoots = getTree(src);
  const map = getLayoutRectMap(nodeMap, treeRoots);
  return src.map((n) => ({ ...n, rect: map.get(n.id)! }));
};

function getLayoutRectMap(nodeMap: Map<string, TableLayoutNode>, treeRoots: TreeNode[]): Map<string, IRectangle> {
  const relativeMap = getTableRelativeRectMap(nodeMap, treeRoots);
  return toAbsoluteRectMap(nodeMap, relativeMap, treeRoots);
}

function getTableRelativeRectMap(
  nodeMap: Map<string, TableLayoutNode>,
  treeRoots: TreeNode[],
): Map<string, IRectangle> {
  const ret = new Map<string, IRectangle>();

  treeRoots.forEach((t) => {
    calcTableRectMapForRoot(ret, nodeMap, t);
  });

  return ret;
}

function calcTableRectMapForRoot(
  ret: Map<string, IRectangle>,
  nodeMap: Map<string, TableLayoutNode>,
  treeNode: TreeNode,
) {
  const node = nodeMap.get(treeNode.id)!;
  if (node.type === "box") {
    calcTableRectMap(ret, nodeMap, treeNode, { x: 0, y: 0 });
  } else {
    ret.set(node.id, node.rect);
  }
}

function calcTableRectMap(
  ret: Map<string, IRectangle>,
  nodeMap: Map<string, TableLayoutNode>,
  treeNode: TreeNode,
  from: IVec2,
) {
  const node = nodeMap.get(treeNode.id)!;

  if (node.type === "box" && treeNode.children.length > 0) {
    const matrixMap = newMatrixMap<TreeNode>();
    treeNode.children.forEach((c) => {
      const cNode = nodeMap.get(c.id)!;
      matrixMap.add(cNode.coords!, c);
    });

    const gapC = 0;
    let cellX = 0;
    let cellY = 0;

    node.rows.forEach((row) => {
      let y = cellY;
      node.columns.forEach((column) => {
        const items = matrixMap.get([row.id, column.id]);
        let itemBoundsWidth = 0;
        items?.forEach((c) => {
          itemBoundsWidth += nodeMap.get(c.id)!.rect.width;
        });
        const paddingX = (column.size - itemBoundsWidth) / 2;
        let x = cellX + paddingX;

        items?.forEach((c) => {
          const paddingY = (row.size - nodeMap.get(c.id)!.rect.height) / 2;
          calcTableRectMap(ret, nodeMap, c, { x, y: y + paddingY });
          const crect = ret.get(c.id)!;
          x += crect.width + gapC;
        });

        cellX += column.size;
      });

      cellY += row.size;
      cellX = 0;
    });

    const boxRect = { ...from, width: cellX, height: cellY };
    ret.set(node.id, boxRect);
  } else {
    ret.set(node.id, { ...node.rect, ...from });
  }
}

function newMatrixMap<T>() {
  const rowMap = new Map<string, Map<string, Set<T>>>();

  function add(coords: Coords, item: T) {
    let row = rowMap.get(coords[0]);
    if (!row) {
      row = new Map();
      rowMap.set(coords[0], row);
    }
    let column = row.get(coords[1]);
    if (!column) {
      column = new Set();
      row.set(coords[1], column);
    }
    column.add(item);
  }

  function get(coords: Coords) {
    return rowMap.get(coords[0])?.get(coords[1]);
  }

  function toMap() {
    const ret = new Map<Coords, Set<T>>();
    rowMap.forEach((row, rowId) => {
      row.forEach((column, columnId) => {
        ret.set([rowId, columnId], column);
      });
    });
    return ret;
  }

  return { add, get, toMap };
}
