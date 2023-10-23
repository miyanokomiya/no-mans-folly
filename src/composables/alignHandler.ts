import { AffineMatrix, getRectCenter, isSame, multiAffines, rotate } from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import { AlignBoxShape, isAlignBoxShape } from "../shapes/align/alignBox";
import { AlignLayoutNode, alignLayout } from "../utils/layouts/align";
import { flatTree, getBranchPath } from "../utils/tree";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { DocOutput } from "../models/document";
import { createShape, resizeShape } from "../shapes";
import { generateKeyBetween } from "fractional-indexing";
import { RectangleShape } from "../shapes/rectangle";
import { getRotateFn } from "../utils/geometry";

interface AlignHandlerOption {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export function newAlignHandler(_option: AlignHandlerOption) {}
export type AlignHandler = ReturnType<typeof newAlignHandler>;

function toLayoutNode(shapeComposite: ShapeComposite, shape: Shape): AlignLayoutNode | undefined {
  const parent = shape.parentId ? shapeComposite.mergedShapeMap[shape.parentId] : undefined;
  const parentId = parent && isAlignBoxShape(parent) ? parent.id : "";

  if (isAlignBoxShape(shape)) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    return {
      id: shape.id,
      findex: shape.findex,
      parentId,
      type: "box",
      rect,
      direction: shape.direction,
      gap: shape.gap,
    };
  } else {
    const rect = shapeComposite.getWrapperRect(shape);
    return parentId ? { id: shape.id, findex: shape.findex, type: "entity", rect, parentId } : undefined;
  }
}

function toLayoutNodes(
  shapeComposite: ShapeComposite,
  rootId: string,
): { layoutNodes: AlignLayoutNode[]; rootShape: AlignBoxShape } {
  const root = shapeComposite.mergedShapeTreeMap[rootId];
  const rootShape = shapeComposite.mergedShapeMap[root.id] as AlignBoxShape;

  const c = getRectCenter({ x: rootShape.p.x, y: rootShape.p.y, width: rootShape.width, height: rootShape.height });
  const rotateFn = getRotateFn(rootShape.rotation, c);

  const layoutNodes: AlignLayoutNode[] = [];
  flatTree([root]).forEach((t) => {
    const s = shapeComposite.mergedShapeMap[t.id];
    const node = toLayoutNode(shapeComposite, {
      ...s,
      rotation: 0,
    });
    if (node) {
      if (rootShape.id !== t.id) {
        const sc = getRectCenter(node.rect);
        layoutNodes.push({
          ...node,
          rect: { ...node.rect, ...rotateFn(rotate(node.rect, s.rotation, sc), true) },
        });
      } else {
        layoutNodes.push(node);
      }
    }
  });
  return { layoutNodes, rootShape };
}

export function getNextAlignLayout(shapeComposite: ShapeComposite, rootId: string): { [id: string]: Partial<Shape> } {
  const { layoutNodes, rootShape } = toLayoutNodes(shapeComposite, rootId);
  const result = alignLayout(layoutNodes);

  // Apply root rotation to layout result if the root has rotation
  const rotatedPatchMap: { [id: string]: Partial<Shape> & Partial<AlignBoxShape> } = {};
  if (rootShape.rotation !== 0) {
    const layoutRootNode = layoutNodes.find((n) => n.id === rootId)!;
    const layoutRootCenter = getRectCenter(layoutRootNode.rect);
    const cos = Math.cos(rootShape.rotation);
    const sin = Math.sin(rootShape.rotation);
    const affine: AffineMatrix = multiAffines([
      [1, 0, 0, 1, layoutRootCenter.x, layoutRootCenter.y],
      [cos, sin, -sin, cos, 0, 0],
      [1, 0, 0, 1, -layoutRootCenter.x, -layoutRootCenter.y],
    ]);

    // Get updated shapes without rotation
    const updated = result.map<Shape>((r) => {
      const s = shapeComposite.shapeMap[r.id];
      if (isAlignBoxShape(s)) {
        return { ...s, rotation: 0, p: { x: r.rect.x, y: r.rect.y }, width: r.rect.width, height: r.rect.height };
      } else {
        return { ...s, rotation: 0, p: { x: r.rect.x, y: r.rect.y } };
      }
    });

    // Get rotated patch info
    updated.forEach((s) => {
      rotatedPatchMap[s.id] = resizeShape(shapeComposite.getShapeStruct, s, affine);
    });
  }

  const ret: { [id: string]: Partial<Shape> & Partial<AlignBoxShape> } = {};
  result.forEach((r) => {
    const s = shapeComposite.shapeMap[r.id];
    const rotatedPatch = rotatedPatchMap[r.id] ?? {};

    const patch: Partial<Shape> & Partial<AlignBoxShape> = {};
    let updated = false;
    if (isAlignBoxShape(s)) {
      const p = rotatedPatch.p ?? { x: r.rect.x, y: r.rect.y };
      if (!isSame(s.p, p)) {
        patch.p = p;
        updated = true;
      }

      const width = rotatedPatch.width ?? r.rect.width;
      if (width !== s.width) {
        patch.width = width;
        updated = true;
      }

      const height = rotatedPatch.height ?? r.rect.height;
      if (height !== s.height) {
        patch.height = height;
        updated = true;
      }
    } else {
      const p = rotatedPatch.p ?? { x: r.rect.x, y: r.rect.y };
      if (!isSame(s.p, p)) {
        patch.p = p;
        updated = true;
      }

      if (rootShape.rotation !== s.rotation) {
        patch.rotation = rootShape.rotation;
        updated = true;
      }
    }

    if (updated) ret[r.id] = patch;
  });

  return ret;
}

export function getAlignLayoutPatchFunctions(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
) {
  return getModifiedAlignRootIds(srcComposite, updatedComposite, patchInfo).map((id) => {
    return () => getNextAlignLayout(updatedComposite, id);
  });
}

export function getModifiedAlignRootIds(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
) {
  const targetRootIdSet = new Set<string>();
  const deletedRootIdSet = new Set<string>();

  const shapeMap = srcComposite.shapeMap;
  const updatedShapeMap = updatedComposite.shapeMap;

  srcComposite.mergedShapeTreeMap;

  const saveParentBoxes = (s: Shape) => {
    // Seek the shallowest align box shape.
    getBranchPath(srcComposite.mergedShapeTreeMap, s.id).some((id) => {
      if (isAlignBoxShape(shapeMap[id])) {
        targetRootIdSet.add(id);
        return true;
      }
    });
  };

  const saveUpdatedParentBoxes = (s: Shape) => {
    // Seek the shallowest align box shape.
    getBranchPath(updatedComposite.mergedShapeTreeMap, s.id).some((id) => {
      if (isAlignBoxShape(updatedShapeMap[id])) {
        targetRootIdSet.add(id);
        return true;
      }
    });
  };

  if (patchInfo.add) {
    patchInfo.add.forEach((shape) => {
      saveUpdatedParentBoxes(shape);
    });
  }

  if (patchInfo.update) {
    Object.keys(patchInfo.update).forEach((id) => {
      const currentAlignId = getBranchPath(srcComposite.mergedShapeTreeMap, id).find((id) => {
        if (isAlignBoxShape(shapeMap[id])) {
          return true;
        }
      });

      const nextAlignId = getBranchPath(updatedComposite.mergedShapeTreeMap, id).find((id) => {
        if (isAlignBoxShape(updatedShapeMap[id])) {
          return true;
        }
      });

      if (currentAlignId && nextAlignId && id === currentAlignId && currentAlignId !== nextAlignId) {
        // Root board becomes a child of other board.
        // => Should pick eventual root board only.
        targetRootIdSet.add(nextAlignId);
      } else {
        if (currentAlignId) targetRootIdSet.add(currentAlignId);
        if (nextAlignId) targetRootIdSet.add(nextAlignId);
      }
    });
  }

  if (patchInfo.delete) {
    patchInfo.delete.forEach((id) => {
      const shape = shapeMap[id];
      if (isAlignBoxShape(shape)) {
        deletedRootIdSet.add(id);
      }
      saveParentBoxes(shape);
    });
  }

  return Array.from(targetRootIdSet).filter((id) => !deletedRootIdSet.has(id));
}

export function generateAlignTemplate(
  ctx: Pick<AppCanvasStateContext, "getShapeStruct" | "generateUuid" | "createLastIndex">,
): { shapes: Shape[]; docMap: { [id: string]: DocOutput } } {
  const root = createShape<AlignBoxShape>(ctx.getShapeStruct, "align_box", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(ctx.createLastIndex(), null),
    height: 300,
    direction: 0,
    gap: 10,
  });
  const column0 = createShape<RectangleShape>(ctx.getShapeStruct, "rectangle", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(root.findex, null),
    parentId: root.id,
    width: 100,
    height: 100,
  });
  const column1 = createShape<RectangleShape>(ctx.getShapeStruct, "rectangle", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(column0.findex, null),
    parentId: root.id,
    width: 100,
    height: 100,
  });
  const composite = newShapeComposite({
    shapes: [root, column0, column1],
    getStruct: ctx.getShapeStruct,
  });
  const patch = getNextAlignLayout(composite, root.id);
  const shapes = composite.shapes.map((s) => ({ ...s, ...patch[s.id] }));

  return { shapes, docMap: {} };
}
