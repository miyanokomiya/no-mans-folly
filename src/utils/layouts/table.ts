import { IRectangle } from "okageo";
import { getTree, TreeNode } from "../tree";
import { LayoutFn, LayoutNode, toAbsoluteRectMap } from "./core";
import { divideSafely, MergeArea } from "../geometry";
import { Size } from "../../models";
import { findBackward, findexSortFn } from "../commons";

type TableCoords = [rowId: string, columnId: string];

export interface CellAlign {
  hAlign?: "left" | "center" | "right"; // "undefined" should mean "center"
  vAlign?: "top" | "center" | "bottom"; // "undefined" should mean "center"
}

type CellStyleValue = CellAlign;
type CellStyleArea = [MergeArea[0], MergeArea[1], CellStyleValue];

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

/**
 * fit: When true, the line adjust its size according to its content while keeping "baseSize" as minimum
 */
export type TableLayoutLineValue = {
  size: number;
  fit?: boolean;
  baseSize?: number;
};

type TableLayoutLine = TableLayoutLineValue & {
  id: string;
};

export interface TableLayoutBox extends TableLayoutBase {
  type: "box";
  columns: TableLayoutLine[];
  rows: TableLayoutLine[];
  mergeAreas?: MergeArea[];
  styleAreas?: CellStyleArea[];
}

export const tableLayout: LayoutFn<TableLayoutNode> = (src) => {
  const nodeMap = new Map(src.map((n) => [n.id, n]));
  const treeRoots = getTree(src);
  const result = getLayoutRectMap(nodeMap, treeRoots);
  return Array.from(result.nodeMap.values()).map((n) => ({ ...n, rect: result.rectMap.get(n.id)! }));
};

/**
 * Line sizes can change when "fit" option is active
 * => Returned "nodeMap" holds changed line sizes
 */
function getLayoutRectMap(
  nodeMap: Map<string, TableLayoutNode>,
  treeRoots: TreeNode[],
): { rectMap: Map<string, IRectangle>; nodeMap: Map<string, TableLayoutNode> } {
  const relativeInfo = getTableRelativeRectMap(nodeMap, treeRoots);
  const absRectMap = toAbsoluteRectMap(nodeMap, relativeInfo.rectMap, treeRoots);
  return { rectMap: absRectMap, nodeMap: relativeInfo.nodeMap };
}

function getTableRelativeRectMap(
  nodeMap: Map<string, TableLayoutNode>,
  treeRoots: TreeNode[],
): { rectMap: Map<string, IRectangle>; nodeMap: Map<string, TableLayoutNode> } {
  const ret = new Map<string, IRectangle>();
  const retNodeMap = new Map<string, TableLayoutNode>();

  treeRoots.forEach((t) => {
    const node = nodeMap.get(t.id)!;
    if (node.type === "box") {
      const lineSizeInfo = calcTableRectMapForRoot(ret, nodeMap, t);
      retNodeMap.set(node.id, {
        ...node,
        rows: node.rows.map((l, i) => ({ ...l, size: lineSizeInfo.rows[i] })),
        columns: node.columns.map((l, i) => ({ ...l, size: lineSizeInfo.columns[i] })),
      });

      t.children.forEach((c) => {
        const cNode = nodeMap.get(c.id)!;
        retNodeMap.set(c.id, cNode);
      });
    } else {
      ret.set(node.id, node.rect);
      retNodeMap.set(node.id, node);
    }
  });

  return { rectMap: ret, nodeMap: retNodeMap };
}

function calcTableRectMapForRoot(
  ret: Map<string, IRectangle>,
  nodeMap: Map<string, TableLayoutNode>,
  treeNode: TreeNode,
): LineSizeInfo {
  const node = nodeMap.get(treeNode.id)! as TableLayoutBox;
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

  return calcTableRectMap(ret, nodeMap, treeNode, mergeAreaIndexMap);
}

function calcTableRectMap(
  ret: Map<string, IRectangle>,
  nodeMap: Map<string, TableLayoutNode>,
  treeNode: TreeNode,
  mergeAreaIndexMap: Map<string, [number, number][]>,
): LineSizeInfo {
  const tableNode = nodeMap.get(treeNode.id)! as TableLayoutBox;

  const matrixMap = newMatrixMap<TreeNode>();
  treeNode.children.forEach((c) => {
    const cNode = nodeMap.get(c.id)!;
    matrixMap.add(cNode.coords!, c);
  });

  const lineSizeInfo = getLineSizeInfo(nodeMap, treeNode, mergeAreaIndexMap, matrixMap);

  let cellX = 0;
  let tableW = 0;
  let cellY = 0;
  const checkedMap = new Map<number, Set<number>>();

  tableNode.rows.forEach((row, rowIndex) => {
    const rowSize = lineSizeInfo.rows[rowIndex];
    let y = cellY;

    const effectiveStyleAreasByRow =
      tableNode.styleAreas?.filter((sa) => {
        return sa[0][0] <= rowIndex && rowIndex <= sa[1][0];
      }) ?? [];

    tableNode.columns.forEach((column, columnIndex) => {
      const columnSize = lineSizeInfo.columns[columnIndex];

      const checkedSet = checkedMap.get(rowIndex);
      if (checkedSet?.has(columnIndex)) {
        cellX += columnSize;
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
        const others = matrixMap.get([tableNode.rows[r].id, tableNode.columns[c].id]);
        others?.forEach((item) => otherItems?.add(item));
      }
      if (otherItems.size > 0) {
        otherItems.forEach((item) => items.add(item));
      }

      let effectiveCellSize: Size = { width: columnSize, height: rowSize };
      // Derive the size of the merged area
      if (mergeCellSet.length > 0) {
        let { width, height } = effectiveCellSize;
        const checkedRow = new Set([rowIndex]);
        const checkedColumn = new Set([columnIndex]);
        mergeCellSet.forEach(([r, c]) => {
          if (!checkedRow.has(r)) {
            height += lineSizeInfo.rows[r];
            checkedRow.add(r);
          }
          if (!checkedColumn.has(c)) {
            width += lineSizeInfo.columns[c];
            checkedColumn.add(c);
          }
        });
        effectiveCellSize = { width, height };
      }

      const itemList = Array.from(items).map((c) => nodeMap.get(c.id)!);
      // Need to sort when the items distribute over multiple areas
      if (otherItems.size > 0) {
        itemList.sort(findexSortFn);
      }

      let itemBoundsWidth = 0;
      let fixedItemBoundsWidth = 0;
      itemList.forEach((cNode) => {
        itemBoundsWidth += cNode.rect.width;
        if (!cNode.fullH) {
          fixedItemBoundsWidth += cNode.rect.width;
        }
      });

      const effectiveStyleValue = pickCellStyleValueByColumn(effectiveStyleAreasByRow, columnIndex);
      const hPaddingRate = getPaddingRateH(effectiveStyleValue.hAlign);
      const vPaddingRate = getPaddingRateV(effectiveStyleValue.vAlign);

      const hasFullHItem = itemList.some((cNode) => cNode.fullH);
      const remainWidth = hasFullHItem ? 0 : effectiveCellSize.width - itemBoundsWidth;
      const fullHScale = divideSafely(
        effectiveCellSize.width - fixedItemBoundsWidth,
        itemBoundsWidth - fixedItemBoundsWidth,
        1,
      );

      let x = cellX + remainWidth * hPaddingRate;
      itemList.forEach((cNode) => {
        const width = cNode.rect.width * (cNode.fullH ? fullHScale : 1);
        const height = cNode.fullV ? effectiveCellSize.height : cNode.rect.height;
        const remainHeight = effectiveCellSize.height - height;
        const cRect = { width, height, x, y: y + remainHeight * vPaddingRate };
        ret.set(cNode.id, cRect);
        x += cRect.width;
      });

      cellX += columnSize;
    });

    cellY += rowSize;
    tableW = Math.max(tableW, cellX);
    cellX = 0;
  });

  const boxRect = { x: 0, y: 0, width: tableW, height: cellY };
  ret.set(tableNode.id, boxRect);
  return lineSizeInfo;
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
type MatrixMap<T> = ReturnType<typeof newMatrixMap<T>>;

function getIndexKey(val: [number, number]): string {
  return `${val[0]}:${val[1]}`;
}

type LineSizeInfo = { rows: number[]; columns: number[] };

function getLineSizeInfo(
  nodeMap: Map<string, TableLayoutNode>,
  treeNode: TreeNode,
  mergeAreaIndexMap: Map<string, [number, number][]>,
  matrixMap: MatrixMap<TreeNode>,
): LineSizeInfo {
  const node = nodeMap.get(treeNode.id)! as TableLayoutBox;
  const cellContentSizeMap = new Map<string, Size>();
  const checkedMap = new Map<number, Set<number>>();

  node.rows.forEach((row, rowIndex) => {
    node.columns.forEach((column, columnIndex) => {
      if (checkedMap.get(rowIndex)?.has(columnIndex)) return;

      const indexKey = getIndexKey([rowIndex, columnIndex]);
      const mergeCellSet = mergeAreaIndexMap.get(indexKey) ?? [];
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
      if (items.size === 0) return;

      const contentSize: Size = { width: 0, height: 0 };
      items.forEach((item) => {
        const itemNode = nodeMap.get(item.id)!;
        contentSize.width += itemNode.rect.width;
        contentSize.height += itemNode.rect.height;
      });

      const indexCellSize: Size = { width: column.size, height: row.size };
      let mergedCellSize: Size = indexCellSize;
      // Derive the size of the merged area
      if (mergeCellSet.length > 0) {
        let width = mergedCellSize.width;
        let height = mergedCellSize.height;
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
        mergedCellSize = { width, height };
      }

      if (indexCellSize === mergedCellSize) {
        cellContentSizeMap.set(indexKey, contentSize);
      } else {
        const otherSize = {
          width: mergedCellSize.width - indexCellSize.width,
          height: mergedCellSize.height - indexCellSize.height,
        };
        const effectiveSize = {
          width: contentSize.width - otherSize.width,
          height: contentSize.height - otherSize.height,
        };
        const indexContentSize = {
          width: Math.max(0, effectiveSize.width),
          height: Math.max(0, effectiveSize.height),
        };
        cellContentSizeMap.set(indexKey, indexContentSize);
      }
    });
  });

  const rows = node.rows.map((row, rowIndex) => {
    let size = row.size;
    if (row.fit) {
      size = row.baseSize ?? 1;
      let hasContent = false;
      node.columns.forEach((_, columnIndex) => {
        const contentSize = cellContentSizeMap.get(getIndexKey([rowIndex, columnIndex]))?.height;
        if (contentSize !== undefined) {
          hasContent = true;
          size = Math.max(size, contentSize);
        }
      });
      // Keep current size when there's no content
      if (!hasContent) {
        size = row.size;
      }
    }

    return size;
  });
  const columns = node.columns.map((column, columnIndex) => {
    let size = column.size;
    if (column.fit) {
      size = column.baseSize ?? 1;
      let hasContent = false;
      node.rows.forEach((_, rowIndex) => {
        const contentSize = cellContentSizeMap.get(getIndexKey([rowIndex, columnIndex]))?.width;
        if (contentSize !== undefined) {
          hasContent = true;
          size = Math.max(size, contentSize);
        }
      });
      // Keep current size when there's no content
      if (!hasContent) {
        size = column.size;
      }
    }

    return size;
  });

  return { rows, columns };
}

function getPaddingRateH(hAlign?: CellAlign["hAlign"]): number {
  switch (hAlign) {
    case "left": {
      return 0;
    }
    case "right": {
      return 1;
    }
    default: {
      return 0.5;
    }
  }
}

function getPaddingRateV(vAlign?: CellAlign["vAlign"]): number {
  switch (vAlign) {
    case "top": {
      return 0;
    }
    case "bottom": {
      return 1;
    }
    default: {
      return 0.5;
    }
  }
}

/**
 * "effectiveStyleAreasByRow" should have been filtered by row.
 */
function pickCellStyleValueByColumn(effectiveStyleAreasByRow: CellStyleArea[], columnIndex: number): CellStyleValue {
  let hAlign: CellStyleValue["hAlign"];
  let vAlign: CellStyleValue["vAlign"];
  findBackward(effectiveStyleAreasByRow, (sa) => {
    if (sa[0][1] <= columnIndex && columnIndex <= sa[1][1]) {
      hAlign ??= sa[2].hAlign;
      vAlign ??= sa[2].vAlign;
      return !!(hAlign && vAlign);
    } else {
      return false;
    }
  });
  return { hAlign, vAlign };
}
