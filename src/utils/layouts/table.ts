import { IRectangle, IVec2 } from "okageo";
import { getTree, TreeNode } from "../tree";
import { LayoutFn, LayoutNode, toAbsoluteRectMap } from "./core";
import { divideSafely, MergeArea } from "../geometry";
import { Size } from "../../models";
import { findexSortFn } from "../commons";

type TableCoords = [rowId: string, columnId: string];
export type TableLayoutNode = TableLayoutBox | TableLayoutEntity;

interface TableLayoutBase extends LayoutNode {
  parentId?: string;
  coords?: TableCoords;
  fullH?: boolean;
  fullV?: boolean;
}

export interface TableLayoutEntity extends TableLayoutBase {
  type: "entity";
  coords: TableCoords;
}

type TableLayoutColumn = { id: string; size: number };
type TableLayoutRow = { id: string; size: number };

export interface TableLayoutBox extends TableLayoutBase {
  type: "box";
  columns: TableLayoutColumn[];
  rows: TableLayoutRow[];
  mergeAreas?: MergeArea[];
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
    const mergeAreaIndexMap = new Map<string, [number, number][]>();
    node.mergeAreas?.forEach((m) => {
      const from = m[0];
      const to = m[1];
      const val: [number, number][] = [];
      for (let r = from[0]; r <= to[0]; r++) {
        for (let c = from[1]; c <= to[1]; c++) {
          val.push([r, c]);
        }
      }
      mergeAreaIndexMap.set(getIndexKey(from), val);
    });

    calcTableRectMap(ret, nodeMap, treeNode, mergeAreaIndexMap, { x: 0, y: 0 });
  } else {
    ret.set(node.id, node.rect);
  }
}

function calcTableRectMap(
  ret: Map<string, IRectangle>,
  nodeMap: Map<string, TableLayoutNode>,
  treeNode: TreeNode,
  mergeAreaIndexMap: Map<string, [number, number][]>,
  from: IVec2,
) {
  const node = nodeMap.get(treeNode.id)! as TableLayoutBox;

  const matrixMap = newMatrixMap<TreeNode>();
  treeNode.children.forEach((c) => {
    const cNode = nodeMap.get(c.id)!;
    matrixMap.add(cNode.coords!, c);
  });

  const gapC = 0;
  let cellX = 0;
  let cellY = 0;
  const checkedMap = new Map<number, Set<number>>();

  node.rows.forEach((row, rowIndex) => {
    let y = cellY;

    node.columns.forEach((column, columnIndex) => {
      const checkedSet = checkedMap.get(rowIndex);
      if (checkedSet?.has(columnIndex)) {
        cellX += column.size;
        return;
      }

      const mergeCellSet = mergeAreaIndexMap.get(getIndexKey([rowIndex, columnIndex])) ?? [];
      for (const [r, c] of mergeCellSet) {
        const v = checkedMap.get(r);
        if (v) {
          v.add(c);
        } else {
          checkedMap.set(r, new Set([c]));
        }
      }

      // Pick items in the index cell
      const items = matrixMap.get([row.id, column.id]) ?? new Set();

      // Pick items in merged cells
      const otherItems = new Set<TreeNode>();
      for (const [r, c] of mergeCellSet) {
        const others = matrixMap.get([node.rows[r].id, node.columns[c].id]);
        others?.forEach((item) => otherItems?.add(item));
      }
      if (otherItems.size > 0) {
        otherItems.forEach((item) => items.add(item));
      }

      let size: Size = { width: column.size, height: row.size };
      // Derive the size of the merged area
      if (mergeCellSet.length > 0) {
        let width = size.width;
        let height = size.height;
        const checkedRow = new Set([rowIndex]);
        const checkedColumn = new Set([columnIndex]);
        mergeCellSet.forEach(([r, c]) => {
          if (!checkedRow.has(r)) {
            height += node.rows[r].size;
            checkedRow.add(r);
          }
          if (!checkedColumn.has(c)) {
            width += node.columns[c].size;
            checkedColumn.add(c);
          }
        });
        size = { width, height };
      }

      const itemList = Array.from(items).map((c) => nodeMap.get(c.id)!);
      // Need to sort when the items distribute over multiple areas
      if (otherItems.size > 0) {
        itemList.sort(findexSortFn);
      }

      const hasFullHItem = itemList.some((cNode) => cNode.fullH);

      let itemBoundsWidth = 0;
      let fixedItemBoundsWidth = 0;
      itemList.forEach((cNode) => {
        itemBoundsWidth += cNode.rect.width;
        if (!cNode.fullH) {
          fixedItemBoundsWidth += cNode.rect.width;
        }
      });
      const remainWidth = hasFullHItem ? 0 : size.width - itemBoundsWidth;
      let x = cellX + remainWidth / 2;

      const fullHScale = divideSafely(size.width - fixedItemBoundsWidth, itemBoundsWidth - fixedItemBoundsWidth, 1);
      itemList.forEach((cNode) => {
        const width = cNode.rect.width * (cNode.fullH ? fullHScale : 1);
        const height = cNode.fullV ? size.height : cNode.rect.height;
        const paddingY = (size.height - height) / 2;
        const cRect = { width, height, x, y: y + paddingY };
        ret.set(cNode.id, cRect);
        x += cRect.width + gapC;
      });

      cellX += column.size;
    });

    cellY += row.size;
    cellX = 0;
  });

  const boxRect = { ...from, width: node.rect.width, height: node.rect.height };
  ret.set(node.id, boxRect);
}

function newMatrixMap<T>() {
  const rowMap = new Map<string, Map<string, Set<T>>>();

  function add(coords: TableCoords, item: T) {
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

  function get(coords: TableCoords) {
    return rowMap.get(coords[0])?.get(coords[1]);
  }

  function toMap() {
    const ret = new Map<TableCoords, Set<T>>();
    rowMap.forEach((row, rowId) => {
      row.forEach((column, columnId) => {
        ret.set([rowId, columnId], column);
      });
    });
    return ret;
  }

  return { add, get, toMap };
}

function getIndexKey(val: [number, number]): string {
  return `${val[0]}:${val[1]}`;
}
