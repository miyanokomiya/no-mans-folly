import { IRectangle } from "okageo";
import { LayoutFn, LayoutNode } from "./core";
import { groupBy } from "../commons";

const BOARD_PADDING = 20;
const COLUMN_MARGIN = 30;
const COLUMN_PADDING = 20;
const LANE_PADDING = 10;
const CARD_MARGIN = 20;

export type BoardLayoutNode = LayoutNode & (BoardLayoutCommon | BoardLayoutCard);

export interface BoardLayoutCommon extends LayoutNode {
  type: "root" | "column" | "lane"; // root should be unique in a layout
}

export interface BoardLayoutCard extends LayoutNode {
  type: "card";
  columnId: string;
  laneId?: string;
}

export const boardLayout: LayoutFn<BoardLayoutNode> = (src) => {
  let root: BoardLayoutCommon | undefined;
  const cardMap = new Map<string, BoardLayoutCard>();
  const columnMap = new Map<string, BoardLayoutCommon>();
  const laneMap = new Map<string, BoardLayoutCommon>();
  src.forEach((n) => {
    switch (n.type) {
      case "card":
        cardMap.set(n.id, n);
        return;
      case "column":
        columnMap.set(n.id, n);
        return;
      case "lane":
        laneMap.set(n.id, n);
        return;
      case "root":
        if (root) {
          console.warn("Board layout should have single root, but detected multiple roots.");
        } else {
          root = n;
        }
        return;
      default:
        return;
    }
  });
  if (!root) throw new Error("Not found board root.");

  const distRectMap = getBoardRectMap(root, cardMap, columnMap, laneMap);
  return src.map((s) => ({ ...s, rect: distRectMap[s.id] }));
};

export function getBoardRectMap(
  root: BoardLayoutCommon,
  cardMap: Map<string, BoardLayoutCard>,
  columnMap: Map<string, BoardLayoutCommon>,
  laneMap: Map<string, BoardLayoutCommon>,
  offsetInfo = {
    boardPadding: BOARD_PADDING,
    columnMargin: COLUMN_MARGIN,
    columnPadding: COLUMN_PADDING,
    lanePadding: LANE_PADDING,
    cardMargin: CARD_MARGIN,
  },
): { [id: string]: IRectangle } {
  const columnIds = Array.from(columnMap.keys());
  const cardsInColumnMap = new Map<string, BoardLayoutCard[]>(columnIds.map((colId) => [colId, []]));
  for (const [, c] of cardMap) {
    cardsInColumnMap.get(c.columnId)?.push(c);
  }

  const laneIds = Array.from(laneMap.keys());
  const cardsInLaneMap = new Map<string, BoardLayoutCard[]>(laneIds.map((laneId) => [laneId, []]));
  cardsInLaneMap.set("", []);
  for (const [, c] of cardMap) {
    cardsInLaneMap.get(c.laneId ?? "")?.push(c);
  }

  const distRectMap: { [id: string]: IRectangle } = {};

  const cardsInLaneByColumnMap = new Map<string, Map<string, BoardLayoutCard[]>>(
    columnIds.map((colId) => [colId, new Map()]),
  );
  const laneHeightMap = new Map<string, number>(laneIds.map((laneId) => [laneId, 2 * offsetInfo.lanePadding]));
  laneHeightMap.set("", 0);
  for (const [columnId, cardsInColumn] of cardsInColumnMap) {
    const map = cardsInLaneByColumnMap.get(columnId)!;
    const goruped = groupBy(cardsInColumn, (c) => c.laneId ?? "");
    for (const [laneId] of cardsInLaneMap) {
      const cards = goruped[laneId] ?? [];
      map.set(laneId, cards);
      const laneHeight =
        cards.reduce((m, c) => m + c.rect.height, 0) +
        (cards.length - 1) * offsetInfo.cardMargin +
        (laneId ? 2 * offsetInfo.lanePadding : 0);
      const h = laneHeightMap.get(laneId)!;
      if (h < laneHeight) {
        laneHeightMap.set(laneId, laneHeight);
      }
    }
  }

  const colTop = offsetInfo.boardPadding + root.rect.y;
  let left = offsetInfo.boardPadding + root.rect.x;
  for (const [columnId, laneMap] of cardsInLaneByColumnMap) {
    const column = columnMap.get(columnId)!;
    const colP = { x: left, y: colTop };
    const cardX = colP.x + offsetInfo.columnPadding;
    const cardW = column.rect.width - 2 * offsetInfo.columnPadding;

    let laneTop = colP.y + offsetInfo.columnPadding;
    for (const [laneId, cardsInLane] of laneMap) {
      let cardTop = laneTop;
      const cards = cardsInLane.filter((c) => c.columnId === columnId);
      if (laneId) {
        cardTop += offsetInfo.lanePadding;
      }

      for (const c of cards) {
        const cardRect = { x: cardX, y: cardTop, width: cardW, height: c.rect.height };
        distRectMap[c.id] = cardRect;

        cardTop += c.rect.height + offsetInfo.cardMargin;
      }
      laneTop += laneHeightMap.get(laneId)! + offsetInfo.cardMargin;
    }

    if (cardsInColumnMap.get(columnId)!.length > 0) {
      laneTop -= offsetInfo.cardMargin;
    }

    distRectMap[columnId] = {
      x: colP.x,
      y: colP.y,
      width: column.rect.width,
      height: laneTop + offsetInfo.columnPadding - colP.y,
    };
    left += column.rect.width + offsetInfo.columnMargin;
  }

  // Columns need to have same height.
  const colMaxHeight = Math.max(...columnIds.map((id) => distRectMap[id].height));
  columnIds.forEach((id) => {
    distRectMap[id] = { ...distRectMap[id], height: colMaxHeight };
  });

  const lastColumnRect = columnIds.length > 0 ? distRectMap[columnIds[columnIds.length - 1]] : undefined;

  if (lastColumnRect) {
    let laneTop = offsetInfo.boardPadding + root.rect.y;
    for (const [laneId, laneHeight] of laneHeightMap) {
      distRectMap[laneId] = {
        x: offsetInfo.boardPadding + root.rect.x,
        y: laneTop,
        width: lastColumnRect.width,
        height: laneHeight,
      };
      laneTop += laneHeight;
    }
  }

  const boardWidth = 2 * offsetInfo.boardPadding + (lastColumnRect?.x ?? 0) + (lastColumnRect?.width ?? 0);
  const boardHeight = 2 * offsetInfo.boardPadding + (lastColumnRect?.y ?? 0) + (lastColumnRect?.height ?? 0);
  distRectMap[root.id] = { ...root.rect, width: boardWidth, height: boardHeight };

  return distRectMap;
}
