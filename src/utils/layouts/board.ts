import { IRectangle } from "okageo";
import { LayoutFn, LayoutNode } from "./core";
import { groupBy } from "../commons";

const BOARD_PADDING = 30;
const COLUMN_MARGIN = 20;
const COLUMN_PADDING = 20;
const LANE_PADDING = 20;
const CARD_MARGIN = 20;

export type BoardLayoutNode = LayoutNode & (BoardLayoutCommon | BoardLayoutCard);

export interface BoardLayoutCommon extends LayoutNode {
  type: "root" | "column" | "lane"; // root should be unique in a layout
  titleHeight?: number;
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
  if (columnMap.size === 0) throw new Error("Not found board column.");

  // Let spacings depend on max width of the columns.
  // It isn't ideal dependance though, there seems no better one in a board.
  // If spacings don't depend at all, resizing a board feels a bit strange.
  const columnMaxWidth = Math.max(...Array.from(columnMap.values()).map((c) => c.rect.width));
  const scale = columnMaxWidth / 300;
  const distRectMap = getBoardRectMap(root, cardMap, columnMap, laneMap, {
    boardPaddingX: BOARD_PADDING * scale,
    boardPaddingY: BOARD_PADDING * scale,
    columnMargin: COLUMN_MARGIN * scale,
    columnPaddingX: COLUMN_PADDING * scale,
    columnPaddingY: COLUMN_PADDING * scale,
    lanePaddingX: LANE_PADDING * scale,
    lanePaddingY: LANE_PADDING * scale,
    cardMargin: CARD_MARGIN * scale,
    columnMinHeight: (10 * CARD_MARGIN + 2 * COLUMN_PADDING) * scale,
    laneMinHeight: (5 * CARD_MARGIN + 2 * LANE_PADDING) * scale,
  });
  return src.map((s) => ({ ...s, rect: distRectMap[s.id] }));
};

export function getBoardRectMap(
  root: BoardLayoutCommon,
  cardMap: Map<string, BoardLayoutCard>,
  columnMap: Map<string, BoardLayoutCommon>,
  laneMap: Map<string, BoardLayoutCommon>,
  offsetInfo = {
    boardPaddingX: BOARD_PADDING,
    boardPaddingY: BOARD_PADDING,
    columnMargin: COLUMN_MARGIN,
    columnPaddingX: COLUMN_PADDING,
    columnPaddingY: COLUMN_PADDING,
    lanePaddingX: LANE_PADDING,
    lanePaddingY: LANE_PADDING,
    cardMargin: CARD_MARGIN,
    columnMinHeight: 10 * CARD_MARGIN + 2 * COLUMN_PADDING,
    laneMinHeight: 5 * CARD_MARGIN + 2 * LANE_PADDING,
  },
): { [id: string]: IRectangle } {
  const columnIds = Array.from(columnMap.keys());
  const cardsInColumnMap = new Map<string, BoardLayoutCard[]>(columnIds.map((colId) => [colId, []]));
  for (const [, c] of cardMap) {
    cardsInColumnMap.get(c.columnId)?.push(c);
  }

  const columnMaxTitleHeight = columnIds.reduce((m, id) => Math.max(m, columnMap.get(id)?.titleHeight ?? 0), 0);

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
  const laneHeightMap = new Map<string, number>(
    laneIds.map((laneId) => [laneId, 2 * offsetInfo.lanePaddingY + (laneMap.get(laneId)?.titleHeight ?? 0)]),
  );
  laneHeightMap.set("", 0);
  for (const [columnId, cardsInColumn] of cardsInColumnMap) {
    const map = cardsInLaneByColumnMap.get(columnId)!;
    const goruped = groupBy(cardsInColumn, (c) => c.laneId ?? "");
    for (const [laneId] of cardsInLaneMap) {
      const cards = goruped[laneId] ?? [];
      map.set(laneId, cards);
      const laneHeight = Math.max(
        cards.reduce((m, c) => m + c.rect.height, 0) +
          (cards.length - 1) * offsetInfo.cardMargin +
          (laneId ? 2 * offsetInfo.lanePaddingY + (laneMap.get(laneId)?.titleHeight ?? 0) : 0),
        offsetInfo.laneMinHeight,
      );
      const h = laneHeightMap.get(laneId)!;
      if (h < laneHeight) {
        laneHeightMap.set(laneId, laneHeight);
      }
    }
  }

  const colTop = offsetInfo.boardPaddingY + root.rect.y + (root.titleHeight ?? 0);
  let left = offsetInfo.boardPaddingX + root.rect.x;
  for (const [columnId, cardsByLane] of cardsInLaneByColumnMap) {
    const column = columnMap.get(columnId)!;
    const colP = { x: left, y: colTop };
    const cardX = colP.x + offsetInfo.columnPaddingX;
    const cardW = column.rect.width - 2 * offsetInfo.columnPaddingX;

    let laneTop = colP.y + offsetInfo.columnPaddingY + columnMaxTitleHeight;
    for (const [laneId, cardsInLane] of cardsByLane) {
      let cardTop = laneTop;
      const cards = cardsInLane.filter((c) => c.columnId === columnId);
      if (laneId) {
        cardTop += offsetInfo.lanePaddingY + (laneMap.get(laneId)?.titleHeight ?? 0);
      }

      for (const c of cards) {
        const cardRect = { x: cardX, y: cardTop, width: cardW, height: c.rect.height };
        distRectMap[c.id] = cardRect;

        cardTop += c.rect.height + offsetInfo.cardMargin;
      }
      laneTop += laneHeightMap.get(laneId)! + offsetInfo.cardMargin;
    }

    laneTop -= offsetInfo.cardMargin;
    distRectMap[columnId] = {
      x: colP.x,
      y: colP.y,
      width: column.rect.width,
      height: Math.max(laneTop + offsetInfo.columnPaddingY - colP.y, offsetInfo.columnMinHeight),
    };
    left += column.rect.width + offsetInfo.columnMargin;
  }

  // Columns need to have same height.
  const colMaxHeight = Math.max(...columnIds.map((id) => distRectMap[id].height));
  columnIds.forEach((id) => {
    distRectMap[id] = { ...distRectMap[id], height: colMaxHeight };
  });

  const lastColumnRect = columnIds.length > 0 ? distRectMap[columnIds[columnIds.length - 1]] : undefined;

  const boardWidth = offsetInfo.boardPaddingX + (lastColumnRect?.x ?? 0) + (lastColumnRect?.width ?? 0) - root.rect.x;
  const boardHeight = offsetInfo.boardPaddingY + (lastColumnRect?.y ?? 0) + (lastColumnRect?.height ?? 0) - root.rect.y;
  distRectMap[root.id] = { ...root.rect, width: boardWidth, height: boardHeight };

  if (lastColumnRect) {
    let laneTop = lastColumnRect.y + offsetInfo.columnPaddingY + columnMaxTitleHeight;
    for (const [laneId, laneHeight] of laneHeightMap) {
      distRectMap[laneId] = {
        x: offsetInfo.boardPaddingX / 2 + root.rect.x,
        y: laneTop,
        width: boardWidth - 2 * offsetInfo.boardPaddingX + offsetInfo.boardPaddingX,
        height: laneHeight,
      };
      laneTop += laneHeight + offsetInfo.cardMargin;
    }
  }

  return distRectMap;
}
