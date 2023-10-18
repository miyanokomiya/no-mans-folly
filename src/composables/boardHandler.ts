import { generateKeyBetween } from "fractional-indexing";
import { EntityPatchInfo, Shape } from "../models";
import { createShape, getWrapperRect } from "../shapes";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { BoardCardShape, isBoardCardShape } from "../shapes/board/boardCard";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { BoardLayoutNode, boardLayout } from "../utils/layouts/board";
import { flatTree } from "../utils/tree";
import { isBoardRootShape } from "../shapes/board/boardRoot";
import { isBoardColumnShape } from "../shapes/board/boardColumn";
import { isBoardLaneShape } from "../shapes/board/boardLane";
import { isSame } from "okageo";
import { RectangleShape } from "../shapes/rectangle";

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
