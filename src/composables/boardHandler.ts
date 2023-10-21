import { generateKeyBetween } from "fractional-indexing";
import { EntityPatchInfo, Shape, StyleScheme } from "../models";
import { createShape, getWrapperRect } from "../shapes";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { BoardCardShape, isBoardCardShape } from "../shapes/board/boardCard";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { BoardLayoutNode, boardLayout } from "../utils/layouts/board";
import { flatTree } from "../utils/tree";
import { BoardRootShape, isBoardRootShape } from "../shapes/board/boardRoot";
import { BoardColumnShape, isBoardColumnShape } from "../shapes/board/boardColumn";
import { BoardLaneShape, isBoardLaneShape } from "../shapes/board/boardLane";
import { IRectangle, IVec2, isSame, sub } from "okageo";
import { RectangleShape } from "../shapes/rectangle";
import { TAU, getD2, getDistanceBetweenPointAndRect } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import { renderPlusIcon } from "../utils/renderer";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { COLORS } from "../utils/color";
import { getFirstItemOfMap, getlastItemOfMap } from "../utils/commons";
import { DocOutput } from "../models/document";
import { getInitialOutput } from "../utils/textEditor";

// Never change these values to avoid messing up findex between different type entities.
const COLUMN_FINDEX_FROM = "a0";
const LANE_FINDEXF_FROM = "a1";
const CARD_FINDEX_FROM = "a2";
const CARD_FINDEX_TO = "a3";

const ANCHOR_SIZE = 10;
const ANCHOR_MARGIN = 20;

export type BoardHitResult =
  | {
      type: "add_card";
      p: IVec2;
      columnId: string;
      laneId: string;
    }
  | {
      type: "add_column";
      p: IVec2;
    }
  | {
      type: "add_lane";
      p: IVec2;
    };

interface Option {
  getShapeComposite: () => ShapeComposite;
  boardId: string;
}

export function newBoardHandler(option: Option) {
  const shapeComposite = option.getShapeComposite();
  const root = shapeComposite.shapeMap[option.boardId] as BoardRootShape;
  const childIds = shapeComposite.mergedShapeTreeMap[root.id].children.map((c) => c.id);
  const columnMap = new Map<string, BoardColumnShape>();
  const laneMap = new Map<string, BoardLaneShape>();
  const cardMap = new Map<string, BoardCardShape>();
  childIds.forEach((id) => {
    const s = shapeComposite.shapeMap[id];
    if (isBoardColumnShape(s)) {
      columnMap.set(s.id, s);
    } else if (isBoardLaneShape(s)) {
      laneMap.set(s.id, s);
    } else if (isBoardCardShape(s)) {
      cardMap.set(s.id, s);
    }
  });
  const cardByLaneByColumnMap = new Map<string, Map<string, BoardCardShape[]>>(
    Array.from(columnMap).map(([id]) => {
      const l = new Map(Array.from(laneMap).map(([id]) => [id, []]));
      l.set("", []);
      return [id, l];
    }),
  );
  for (const [, card] of cardMap) {
    const column = cardByLaneByColumnMap.get(card.columnId)!;
    if (column) {
      column.get(card.laneId ?? "")!.push(card);
    } else {
      // Cards must have valid column
      cardMap.delete(card.id);
    }
  }

  const anchors: BoardHitResult[] = [];
  for (const [columnId, byColumn] of cardByLaneByColumnMap) {
    const column = columnMap.get(columnId)!;
    for (const [laneId] of byColumn) {
      if (laneId) {
        const lane = laneMap.get(laneId)!;
        anchors.push({
          type: "add_card",
          p: { x: column.p.x + column.width / 2, y: lane.p.y + lane.height },
          columnId,
          laneId,
        });
      } else {
        anchors.push({
          type: "add_card",
          p: { x: column.p.x + column.width / 2, y: column.p.y + column.height },
          columnId,
          laneId: "",
        });
      }
    }
  }

  anchors.push({
    type: "add_column",
    p: { x: root.p.x + root.width, y: root.p.y + root.titleHeight + ANCHOR_MARGIN },
  });

  if (columnMap.size > 0) {
    if (laneMap.size === 0) {
      const firstColumn = getFirstItemOfMap(columnMap)!;
      anchors.push({
        type: "add_lane",
        p: { x: root.p.x, y: firstColumn.p.y + firstColumn.titleHeight + ANCHOR_MARGIN },
      });
    } else {
      const lastLane = getlastItemOfMap(laneMap)!;
      anchors.push({
        type: "add_lane",
        p: { x: root.p.x, y: lastLane.p.y + lastLane.height + ANCHOR_MARGIN },
      });
    }
  }

  function hitTest(p: IVec2, scale = 1): BoardHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const t2 = threshold * threshold;
    return anchors.find((a) => getD2(sub(a.p, p)) <= t2);
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: BoardHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    applyFillStyle(ctx, { color: style.selectionPrimary });
    applyStrokeStyle(ctx, { color: COLORS.WHITE, width: 2 * scale });
    anchors.forEach((a) => {
      ctx.beginPath();
      ctx.arc(a.p.x, a.p.y, threshold, 0, TAU);
      ctx.fill();
      renderPlusIcon(ctx, a.p, threshold);
    });

    if (hitResult) {
      applyFillStyle(ctx, { color: style.selectionSecondaly });
      ctx.beginPath();
      ctx.arc(hitResult.p.x, hitResult.p.y, threshold, 0, TAU);
      ctx.fill();
      renderPlusIcon(ctx, hitResult.p, threshold);
    }
  }

  function getCardsInColumnLane(columnId: string, laneId = ""): BoardCardShape[] {
    const byColumn = cardByLaneByColumnMap.get(columnId);
    if (!byColumn) return [];
    return byColumn.get(laneId) ?? [];
  }

  function generateNewColumnFindex(): string {
    const from = getlastItemOfMap(columnMap)?.findex ?? COLUMN_FINDEX_FROM;
    return generateKeyBetween(from, LANE_FINDEXF_FROM);
  }

  function generateNewLaneFindex(): string {
    const from = getlastItemOfMap(laneMap)?.findex ?? LANE_FINDEXF_FROM;
    return generateKeyBetween(from, CARD_FINDEX_FROM);
  }

  function generateNewCardFindex(): string {
    const from = getlastItemOfMap(cardMap)?.findex ?? CARD_FINDEX_FROM;
    return generateKeyBetween(from, CARD_FINDEX_TO);
  }

  function isBoardChanged(ids: string[]): boolean {
    return ids.some((id) => shapeComposite.mergedShapeMap[id]?.parentId === root.id || id === root.id);
  }

  return {
    hitTest,
    render,
    getCardsInColumnLane,
    generateNewColumnFindex,
    generateNewLaneFindex,
    generateNewCardFindex,
    isBoardChanged,
    root,
    columnMap,
    laneMap,
    cardMap,
    cardByLaneByColumnMap,
  };
}
export type BoardHandler = ReturnType<typeof newBoardHandler>;

export function isSameBoardHitResult(a?: BoardHitResult, b?: BoardHitResult): boolean {
  if (a && b) {
    if (a.type !== b.type || !isSame(a.p, b.p)) return false;
    if (a.type === "add_card" && b.type === "add_card") {
      return a.columnId === b.columnId && a.laneId === b.laneId;
    } else {
      return true;
    }
  }

  return !a && !b;
}

export function generateBoardTemplate(
  ctx: Pick<AppCanvasStateContext, "getShapeStruct" | "generateUuid" | "createLastIndex">,
): { shapes: Shape[]; docMap: { [id: string]: DocOutput } } {
  const root = createShape(ctx.getShapeStruct, "board_root", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(ctx.createLastIndex(), null),
  });
  const column0 = createShape(ctx.getShapeStruct, "board_column", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(COLUMN_FINDEX_FROM, LANE_FINDEXF_FROM),
    parentId: root.id,
  });
  const column1 = createShape(ctx.getShapeStruct, "board_column", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(column0.findex, LANE_FINDEXF_FROM),
    parentId: root.id,
  });
  const column2 = createShape(ctx.getShapeStruct, "board_column", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(column1.findex, LANE_FINDEXF_FROM),
    parentId: root.id,
  });
  const card0 = createShape<BoardCardShape>(ctx.getShapeStruct, "board_card", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(CARD_FINDEX_FROM, CARD_FINDEX_TO),
    parentId: root.id,
    columnId: column0.id,
  });
  const card1 = createShape<BoardCardShape>(ctx.getShapeStruct, "board_card", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(card0.findex, CARD_FINDEX_TO),
    parentId: root.id,
    columnId: column0.id,
  });
  const card2 = createShape<BoardCardShape>(ctx.getShapeStruct, "board_card", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(card1.findex, CARD_FINDEX_TO),
    parentId: root.id,
    columnId: column1.id,
  });
  const composite = newShapeComposite({
    shapes: [root, column0, column1, column2, card0, card1, card2],
    getStruct: ctx.getShapeStruct,
  });
  const patch = getNextBoardLayout(composite, root.id);
  const shapes = composite.shapes.map((s) => ({ ...s, ...patch[s.id] }));

  return {
    shapes,
    docMap: {
      [root.id]: [{ insert: "Board" }, ...getInitialOutput()],
      [column0.id]: [{ insert: "To do" }, ...getInitialOutput()],
      [column1.id]: [{ insert: "In progress" }, ...getInitialOutput()],
      [column2.id]: [{ insert: "Done" }, ...getInitialOutput()],
    },
  };
}

export function getNextBoardLayout(shapeComposite: ShapeComposite, rootId: string): { [id: string]: Partial<Shape> } {
  const layoutNodes = toLayoutNodes(shapeComposite, rootId);
  if (layoutNodes.length === 0) return {};

  let result: ReturnType<typeof boardLayout>;
  try {
    result = boardLayout(layoutNodes);
  } catch {
    return {};
  }

  const ret: { [id: string]: Partial<Shape> } = {};
  result.forEach((r) => {
    const src = shapeComposite.shapeMap[r.id] as RectangleShape;
    let changed = false;
    const patch: Partial<RectangleShape> = {};
    if (!isSame(r.rect, src.p)) {
      patch.p = { x: r.rect.x, y: r.rect.y };
      changed = true;
    }
    if (r.rect.width !== src.width) {
      patch.width = r.rect.width;
      changed = true;
    }
    if (r.rect.height !== src.height) {
      patch.height = r.rect.height;
      changed = true;
    }

    // Clear rotation
    // TODO: Allowing rotation isn't impossible, but it requires further adjustments throughtout the process.
    if (src.rotation !== 0) {
      patch.rotation = 0;
      changed = true;
    }

    if (changed) {
      ret[r.id] = patch;
    }
  });

  return ret;
}

export function getBoardLayoutPatchFunctions(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
) {
  return getModifiedBoardRootIds(srcComposite, updatedComposite, patchInfo).map((id) => {
    return () => getNextBoardLayout(updatedComposite, id);
  });
}

export function getModifiedBoardRootIds(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): string[] {
  const targetBoardRootIdSet = new Set<string>();
  const deletedRootIdSet = new Set<string>();

  const shapeMap = srcComposite.shapeMap;
  const updatedShapeMap = updatedComposite.shapeMap;

  const isParentRoot = (s: Shape): s is Shape & { parentId: string } => {
    return !!(s.parentId && shapeMap[s.parentId] && isBoardRootShape(shapeMap[s.parentId]));
  };

  const isParentUpdatedRoot = (s: Shape): s is Shape & { parentId: string } => {
    return !!(s.parentId && updatedShapeMap[s.parentId] && isBoardRootShape(updatedShapeMap[s.parentId]));
  };

  if (patchInfo.add) {
    patchInfo.add.forEach((shape) => {
      if (isBoardRootShape(shape)) {
        targetBoardRootIdSet.add(shape.id);
      } else if (isParentRoot(shape)) {
        targetBoardRootIdSet.add(shape.parentId);
      }
    });
  }

  if (patchInfo.update) {
    Object.keys(patchInfo.update).forEach((id) => {
      const shape = shapeMap[id];
      if (isBoardRootShape(shape)) {
        targetBoardRootIdSet.add(shape.id);
      } else if (isParentRoot(shape)) {
        targetBoardRootIdSet.add(shape.parentId);
      }

      const updatedShape = updatedShapeMap[id];
      if (isBoardRootShape(updatedShape)) {
        targetBoardRootIdSet.add(updatedShape.id);
      } else if (isParentUpdatedRoot(updatedShape)) {
        targetBoardRootIdSet.add(updatedShape.parentId);
      }
    });
  }

  if (patchInfo.delete) {
    patchInfo.delete.forEach((id) => {
      const shape = shapeMap[id];
      if (isBoardRootShape(shape)) {
        deletedRootIdSet.add(shape.id);
      } else if (isParentRoot(shape)) {
        targetBoardRootIdSet.add(shape.parentId);
      }
    });
  }

  return Array.from(targetBoardRootIdSet).filter((id) => !deletedRootIdSet.has(id));
}

function toLayoutNodes(shapeComposite: ShapeComposite, rootId: string): BoardLayoutNode[] {
  const tree = shapeComposite.mergedShapeTreeMap[rootId];
  if (!tree) return [];

  const columnIdSet = new Set<string>();
  const laneIdSet = new Set<string>();
  const layoutNodes: BoardLayoutNode[] = [];
  flatTree([tree]).forEach((t) => {
    const s = shapeComposite.mergedShapeMap[t.id];
    if (isBoardCardShape(s)) return;

    const rect = getWrapperRect(shapeComposite.getShapeStruct, { ...s, rotation: 0 });
    if (isBoardColumnShape(s)) {
      layoutNodes.push({
        id: s.id,
        findex: s.findex,
        rect,
        titleHeight: s.titleHeight,
        type: "column",
      });
      columnIdSet.add(s.id);
    } else if (isBoardLaneShape(s)) {
      layoutNodes.push({
        id: s.id,
        findex: s.findex,
        rect,
        titleHeight: s.titleHeight,
        type: "lane",
      });
      laneIdSet.add(s.id);
    } else if (isBoardRootShape(s)) {
      layoutNodes.push({
        id: s.id,
        findex: s.findex,
        rect,
        titleHeight: s.titleHeight,
        type: "root",
      });
    }
  });

  flatTree([tree]).forEach((t) => {
    const s = shapeComposite.mergedShapeMap[t.id];
    const rect = getWrapperRect(shapeComposite.getShapeStruct, { ...s, rotation: 0 });
    // Ignore cards in invalid columns
    if (isBoardCardShape(s) && columnIdSet.has(s.columnId)) {
      layoutNodes.push({
        id: s.id,
        findex: s.findex,
        rect,
        type: "card",
        columnId: s.columnId,
        // Fallback to default lane when a lane is invalid
        laneId: s.laneId && laneIdSet.has(s.laneId) ? s.laneId : undefined,
      });
    }
  });

  return layoutNodes;
}

export type BoardCardMovingHitResult = {
  columnId: string;
  laneId: string;
  findexBetween: [string | null, string | null];
  rect: IRectangle;
};

interface BoardCardMovingOption extends Option {
  cardIds: string[];
}

export function newBoardCardMovingHandler(option: BoardCardMovingOption) {
  const shapeComposite = option.getShapeComposite();
  const boardHandler = newBoardHandler(option);
  const allCardIdSet = new Set(boardHandler.cardMap.keys());

  const candidateIdSet = new Set(allCardIdSet);
  option.cardIds.forEach((id) => candidateIdSet.delete(id));
  const movingCardIdSet = new Set(option.cardIds);
  const singleMovingId = option.cardIds.length === 1 ? option.cardIds[0] : undefined;

  const shapeMap = shapeComposite.shapeMap;
  const rects = Array.from(candidateIdSet).map<[string, IRectangle]>((id) => [
    id,
    shapeComposite.getWrapperRect(shapeMap[id]),
  ]);

  const emptyCells: { columnId: string; laneId: string }[] = [];
  for (const [columnId, byColumn] of boardHandler.cardByLaneByColumnMap) {
    for (const [laneId, byLane] of byColumn) {
      if (byLane.filter((s) => !movingCardIdSet.has(s.id)).length === 0) {
        emptyCells.push({ columnId, laneId });
      }
    }
  }
  const emptyCellRects = emptyCells.map<[{ columnId: string; laneId: string }, IRectangle]>((cell) => {
    const column = boardHandler.columnMap.get(cell.columnId)!;
    if (cell.laneId) {
      const lane = boardHandler.laneMap.get(cell.laneId)!;
      return [
        cell,
        { x: column.p.x, y: lane.p.y + lane.titleHeight, width: column.width, height: lane.height - lane.titleHeight },
      ];
    } else {
      const lanes = Array.from(boardHandler.laneMap.values());
      if (lanes.length > 0) {
        const lastLane = lanes[lanes.length - 1];
        const y = lastLane.p.y + lastLane.height;
        return [cell, { x: column.p.x, y, width: column.width, height: column.p.y + column.height - y }];
      } else {
        return [
          cell,
          {
            x: column.p.x,
            y: column.p.y + column.titleHeight,
            width: column.width,
            height: column.height - column.titleHeight,
          },
        ];
      }
    }
  });

  function hitTest(p: IVec2): BoardCardMovingHitResult | undefined {
    const evaluated = rects.map<[string, IRectangle, number]>(([id, rect]) => [
      id,
      rect,
      getDistanceBetweenPointAndRect(p, rect),
    ]);
    const [closestId, closestRect, closestD] =
      evaluated.length > 0 ? evaluated.sort((a, b) => a[2] - b[2])[0] : [undefined, undefined, Infinity];

    if (emptyCellRects.length > 0) {
      const emptyEvaluated = emptyCellRects.map<[{ columnId: string; laneId: string }, IRectangle, number]>(
        ([cell, rect]) => [cell, rect, getDistanceBetweenPointAndRect(p, rect)],
      );
      const closestEmtpy = emptyEvaluated.sort((a, b) => a[2] - b[2])[0];
      if (closestEmtpy[2] < closestD) {
        const [cell, rect] = closestEmtpy;
        return {
          columnId: cell.columnId,
          laneId: cell.laneId,
          findexBetween: [CARD_FINDEX_FROM, CARD_FINDEX_TO],
          rect,
        };
      }
    }

    if (!closestId || !closestRect) return;

    const toBelow = closestRect.y + closestRect.height / 2 < p.y;
    const closestCard = boardHandler.cardMap.get(closestId)!;
    const siblings = boardHandler.cardByLaneByColumnMap.get(closestCard.columnId)!.get(closestCard.laneId)!;
    const closestIndex = siblings.findIndex((s) => s.id === closestId);
    const previousIndex = toBelow ? closestIndex : closestIndex - 1;
    const nextIndex = toBelow ? closestIndex + 1 : closestIndex;

    // Allow to pick the same location as current cards.
    // When multiple cards are moving, location updating can still happen.
    let rect: IRectangle;
    let findexBetween: BoardCardMovingHitResult["findexBetween"];
    if (previousIndex === -1) {
      const next = siblings[nextIndex];
      if (next.id === singleMovingId) return;

      const nextRect = shapeComposite.getWrapperRect(next);
      rect = { x: nextRect.x, y: nextRect.y - 15, width: nextRect.width, height: 15 };
      findexBetween = [CARD_FINDEX_FROM, next.findex];
    } else if (nextIndex === siblings.length) {
      const prev = siblings[previousIndex];
      if (prev.id === singleMovingId) return;

      const prevRect = shapeComposite.getWrapperRect(prev);
      rect = { x: prevRect.x, y: prevRect.y + prevRect.height, width: prevRect.width, height: 15 };
      findexBetween = [prev.findex, CARD_FINDEX_TO];
    } else {
      const prev = siblings[previousIndex];
      const next = siblings[nextIndex];
      if (prev.id === singleMovingId || next.id === singleMovingId) return;

      const prevRect = shapeComposite.getWrapperRect(prev);
      const nextRect = shapeComposite.getWrapperRect(next);
      rect = {
        x: prevRect.x,
        y: (prevRect.y + prevRect.height + nextRect.y) / 2 - 7.5,
        width: prevRect.width,
        height: 15,
      };
      findexBetween = [prev.findex, next.findex];
    }

    return {
      findexBetween,
      columnId: closestCard.columnId,
      laneId: closestCard.laneId,
      rect,
    };
  }

  function render(
    ctx: CanvasRenderingContext2D,
    style: StyleScheme,
    _scale: number,
    hitResult?: BoardCardMovingHitResult,
  ) {
    if (hitResult) {
      applyFillStyle(ctx, { color: style.selectionSecondaly });
      ctx.beginPath();
      ctx.rect(hitResult.rect.x, hitResult.rect.y, hitResult.rect.width, hitResult.rect.height);
      ctx.fill();
    }
  }

  return { hitTest, render, isBoardChanged: boardHandler.isBoardChanged };
}
export type BoardCardMovingHandler = ReturnType<typeof newBoardCardMovingHandler>;

export type BoardColumnMovingHitResult = {
  findexBetween: [string | null, string | null];
  rect: IRectangle;
};

interface BoardColumnMovingOption extends Option {
  columnIds: string[];
}

export function newBoardColumnMovingHandler(option: BoardColumnMovingOption) {
  const shapeComposite = option.getShapeComposite();
  const boardHandler = newBoardHandler(option);
  const allColumnIdSet = new Set(boardHandler.columnMap.keys());

  const candidateIdSet = new Set(allColumnIdSet);
  option.columnIds.forEach((id) => candidateIdSet.delete(id));
  const singleMovingId = option.columnIds.length === 1 ? option.columnIds[0] : undefined;

  const shapeMap = shapeComposite.shapeMap;
  const rects = Array.from(candidateIdSet).map<[string, IRectangle]>((id) => [
    id,
    shapeComposite.getWrapperRect(shapeMap[id]),
  ]);

  function hitTest(p: IVec2): BoardColumnMovingHitResult | undefined {
    if (rects.length === 0) return;

    const evaluated = rects.map<[string, IRectangle, number]>(([id, rect]) => [
      id,
      rect,
      getDistanceBetweenPointAndRect(p, rect),
    ]);
    const [closestId, closestRect] = evaluated.sort((a, b) => a[2] - b[2])[0];

    const toNext = closestRect.x + closestRect.width / 2 < p.x;
    const siblings = Array.from(boardHandler.columnMap.values());
    const closestIndex = siblings.findIndex((s) => s.id === closestId);
    const previousIndex = toNext ? closestIndex : closestIndex - 1;
    const nextIndex = toNext ? closestIndex + 1 : closestIndex;

    // Allow to pick the same location as current ones.
    // When multiple items are moving, location updating can still happen.
    let rect: IRectangle;
    let findexBetween: BoardColumnMovingHitResult["findexBetween"];
    if (previousIndex === -1) {
      const next = siblings[nextIndex];
      if (next.id === singleMovingId) return;

      const nextRect = shapeComposite.getWrapperRect(next);
      rect = { x: nextRect.x - 15, y: nextRect.y, width: 15, height: nextRect.height };
      findexBetween = [COLUMN_FINDEX_FROM, next.findex];
    } else if (nextIndex === siblings.length) {
      const prev = siblings[previousIndex];
      if (prev.id === singleMovingId) return;

      const prevRect = shapeComposite.getWrapperRect(prev);
      rect = { x: prevRect.x + prevRect.width, y: prevRect.y, width: 15, height: prevRect.height };
      findexBetween = [prev.findex, LANE_FINDEXF_FROM];
    } else {
      const prev = siblings[previousIndex];
      const next = siblings[nextIndex];
      if (prev.id === singleMovingId || next.id === singleMovingId) return;

      const prevRect = shapeComposite.getWrapperRect(prev);
      const nextRect = shapeComposite.getWrapperRect(next);
      rect = {
        x: (prevRect.x + prevRect.width + nextRect.x) / 2 - 7.5,
        y: prevRect.y,
        width: 15,
        height: prevRect.height,
      };
      findexBetween = [prev.findex, next.findex];
    }

    return {
      findexBetween,
      rect,
    };
  }

  function render(
    ctx: CanvasRenderingContext2D,
    style: StyleScheme,
    _scale: number,
    hitResult?: BoardColumnMovingHitResult,
  ) {
    if (hitResult) {
      applyFillStyle(ctx, { color: style.selectionSecondaly });
      ctx.beginPath();
      ctx.rect(hitResult.rect.x, hitResult.rect.y, hitResult.rect.width, hitResult.rect.height);
      ctx.fill();
    }
  }

  return { hitTest, render, isBoardChanged: boardHandler.isBoardChanged };
}
export type BoardColumnMovingHandler = ReturnType<typeof newBoardColumnMovingHandler>;

export type BoardLaneMovingHitResult = {
  findexBetween: [string | null, string | null];
  rect: IRectangle;
};

interface BoardLaneMovingOption extends Option {
  laneIds: string[];
}

export function newBoardLaneMovingHandler(option: BoardLaneMovingOption) {
  const shapeComposite = option.getShapeComposite();
  const boardHandler = newBoardHandler(option);
  const allLaneIdSet = new Set(boardHandler.laneMap.keys());

  const candidateIdSet = new Set(allLaneIdSet);
  option.laneIds.forEach((id) => candidateIdSet.delete(id));
  const singleMovingId = option.laneIds.length === 1 ? option.laneIds[0] : undefined;

  const shapeMap = shapeComposite.shapeMap;
  const rects = Array.from(candidateIdSet).map<[string, IRectangle]>((id) => [
    id,
    shapeComposite.getWrapperRect(shapeMap[id]),
  ]);

  function hitTest(p: IVec2): BoardLaneMovingHitResult | undefined {
    if (rects.length === 0) return;

    const evaluated = rects.map<[string, IRectangle, number]>(([id, rect]) => [
      id,
      rect,
      getDistanceBetweenPointAndRect(p, rect),
    ]);
    const [closestId, closestRect] = evaluated.sort((a, b) => a[2] - b[2])[0];

    const toNext = closestRect.y + closestRect.height / 2 < p.y;
    const siblings = Array.from(boardHandler.laneMap.values());
    const closestIndex = siblings.findIndex((s) => s.id === closestId);
    const previousIndex = toNext ? closestIndex : closestIndex - 1;
    const nextIndex = toNext ? closestIndex + 1 : closestIndex;

    // Allow to pick the same location as current ones.
    // When multiple items are moving, location updating can still happen.
    let rect: IRectangle;
    let findexBetween: BoardLaneMovingHitResult["findexBetween"];
    if (previousIndex === -1) {
      const next = siblings[nextIndex];
      if (next.id === singleMovingId) return;

      const nextRect = shapeComposite.getWrapperRect(next);
      rect = { x: nextRect.x, y: nextRect.y - 15, width: nextRect.width, height: 15 };
      findexBetween = [LANE_FINDEXF_FROM, next.findex];
    } else if (nextIndex === siblings.length) {
      const prev = siblings[previousIndex];
      if (prev.id === singleMovingId) return;

      const prevRect = shapeComposite.getWrapperRect(prev);
      rect = { x: prevRect.x, y: prevRect.y + prevRect.height, width: prevRect.width, height: 15 };
      findexBetween = [prev.findex, CARD_FINDEX_FROM];
    } else {
      const prev = siblings[previousIndex];
      const next = siblings[nextIndex];
      if (prev.id === singleMovingId || next.id === singleMovingId) return;

      const prevRect = shapeComposite.getWrapperRect(prev);
      const nextRect = shapeComposite.getWrapperRect(next);
      rect = {
        x: prevRect.x,
        y: (prevRect.y + prevRect.height + nextRect.y) / 2 - 7.5,
        width: prevRect.width,
        height: 15,
      };
      findexBetween = [prev.findex, next.findex];
    }

    return {
      findexBetween,
      rect,
    };
  }

  function render(
    ctx: CanvasRenderingContext2D,
    style: StyleScheme,
    _scale: number,
    hitResult?: BoardLaneMovingHitResult,
  ) {
    if (hitResult) {
      applyFillStyle(ctx, { color: style.selectionSecondaly });
      ctx.beginPath();
      ctx.rect(hitResult.rect.x, hitResult.rect.y, hitResult.rect.width, hitResult.rect.height);
      ctx.fill();
    }
  }

  return { hitTest, render, isBoardChanged: boardHandler.isBoardChanged };
}
export type BoardLaneMovingHandler = ReturnType<typeof newBoardLaneMovingHandler>;
