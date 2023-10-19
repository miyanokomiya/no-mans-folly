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
import { IVec2, isSame, sub } from "okageo";
import { RectangleShape } from "../shapes/rectangle";
import { TAU, getD2 } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import { renderPlusIcon } from "../utils/renderer";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { COLORS } from "../utils/color";
import { getFirstItemOfMap, getlastItemOfMap } from "../utils/commons";

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
    column.get(card.laneId ?? "")!.push(card);
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
    p: { x: root.p.x + root.width, y: root.p.y + ANCHOR_MARGIN },
  });
  anchors.push({
    type: "add_lane",
    p: { x: root.p.x + ANCHOR_MARGIN, y: root.p.y + root.height },
  });

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
    const from = getlastItemOfMap(columnMap)?.findex ?? root.findex;
    const to = getFirstItemOfMap(laneMap)?.findex ?? getFirstItemOfMap(cardMap)?.findex ?? null;
    return generateKeyBetween(from, to);
  }

  function generateNewLaneFindex(): string {
    const from = getlastItemOfMap(laneMap)?.findex ?? getlastItemOfMap(columnMap)?.findex ?? root.findex;
    const to = getFirstItemOfMap(cardMap)?.findex ?? null;
    return generateKeyBetween(from, to);
  }

  function isBoardChanged(ids: string[]): boolean {
    return ids.some((id) => shapeComposite.mergedShapeMap[id]?.parentId === root.id || id === root.id);
  }

  return { hitTest, render, getCardsInColumnLane, generateNewColumnFindex, generateNewLaneFindex, isBoardChanged };
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
): Shape[] {
  const findex = ctx.createLastIndex();
  const root = createShape(ctx.getShapeStruct, "board_root", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(findex, null),
  });
  const column0 = createShape(ctx.getShapeStruct, "board_column", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(root.findex, null),
    parentId: root.id,
  });
  const column1 = createShape(ctx.getShapeStruct, "board_column", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(column0.findex, null),
    parentId: root.id,
  });
  const column2 = createShape(ctx.getShapeStruct, "board_column", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(column1.findex, null),
    parentId: root.id,
  });
  const card0 = createShape<BoardCardShape>(ctx.getShapeStruct, "board_card", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(column2.findex, null),
    parentId: root.id,
    columnId: column0.id,
  });
  const card1 = createShape<BoardCardShape>(ctx.getShapeStruct, "board_card", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(card0.findex, null),
    parentId: root.id,
    columnId: column0.id,
  });
  const card2 = createShape<BoardCardShape>(ctx.getShapeStruct, "board_card", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(card1.findex, null),
    parentId: root.id,
    columnId: column1.id,
  });
  const composite = newShapeComposite({
    shapes: [root, column0, column1, column2, card0, card1, card2],
    getStruct: ctx.getShapeStruct,
  });
  const patch = getNextBoardLayout(composite, root.id);
  return composite.shapes.map((s) => ({ ...s, ...patch[s.id] }));
}

export function getNextBoardLayout(shapeComposite: ShapeComposite, rootId: string): { [id: string]: Partial<Shape> } {
  const layoutNodes = toLayoutNodes(shapeComposite, rootId);
  const result = boardLayout(layoutNodes);
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
  return getModifiedBoardRootIds(srcComposite, patchInfo).map((id) => {
    return () => getNextBoardLayout(updatedComposite, id);
  });
}

export function getModifiedBoardRootIds(srcComposite: ShapeComposite, patchInfo: EntityPatchInfo<Shape>): string[] {
  const targetBoardRootIdSet = new Set<string>();
  const deletedRootIdSet = new Set<string>();

  const shapeMap = srcComposite.shapeMap;
  if (patchInfo.add) {
    patchInfo.add.forEach((shape) => {
      if (isBoardRootShape(shape)) {
        targetBoardRootIdSet.add(shape.id);
      } else if (shape.parentId && isBoardRootShape(shapeMap[shape.parentId])) {
        targetBoardRootIdSet.add(shape.parentId);
      }
    });
  }

  if (patchInfo.update) {
    Object.keys(patchInfo.update).forEach((id) => {
      const shape = shapeMap[id];
      if (isBoardRootShape(shape)) {
        targetBoardRootIdSet.add(shape.id);
      } else if (shape.parentId && isBoardRootShape(shapeMap[shape.parentId])) {
        targetBoardRootIdSet.add(shape.parentId);
      }
    });
  }

  if (patchInfo.delete) {
    patchInfo.delete.forEach((id) => {
      const shape = shapeMap[id];
      if (isBoardRootShape(shape)) {
        deletedRootIdSet.add(shape.id);
      } else if (shape.parentId && isBoardRootShape(shapeMap[shape.parentId])) {
        targetBoardRootIdSet.add(shape.parentId);
      }
    });
  }

  return Array.from(targetBoardRootIdSet).filter((id) => !deletedRootIdSet.has(id));
}

function toLayoutNodes(shapeComposite: ShapeComposite, rootId: string): BoardLayoutNode[] {
  const tree = shapeComposite.mergedShapeTreeMap[rootId];
  const layoutNodes: BoardLayoutNode[] = [];
  flatTree([tree]).forEach((t) => {
    const s = shapeComposite.mergedShapeMap[t.id];
    const rect = getWrapperRect(shapeComposite.getShapeStruct, s);
    if (isBoardColumnShape(s)) {
      layoutNodes.push({
        id: s.id,
        findex: s.findex,
        rect,
        type: "column",
      });
    } else if (isBoardLaneShape(s)) {
      layoutNodes.push({
        id: s.id,
        findex: s.findex,
        rect,
        type: "lane",
      });
    } else if (isBoardCardShape(s)) {
      layoutNodes.push({
        id: s.id,
        findex: s.findex,
        rect,
        type: "card",
        columnId: s.columnId,
        laneId: s.laneId,
      });
    } else if (isBoardRootShape(s)) {
      layoutNodes.push({
        id: s.id,
        findex: s.findex,
        rect,
        type: "root",
      });
    }
  });
  return layoutNodes;
}
