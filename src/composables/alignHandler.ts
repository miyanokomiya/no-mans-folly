import { isSame } from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import { AlignBoxShape, isAlignBoxShape } from "../shapes/align/alignBox";
import { AlignLayoutNode, alignLayout } from "../utils/layouts/align";
import { flatTree, getBranchPath } from "../utils/tree";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { DocOutput } from "../models/document";
import { createShape } from "../shapes";
import { generateKeyBetween } from "fractional-indexing";
import { RectangleShape } from "../shapes/rectangle";

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

function toLayoutNodes(shapeComposite: ShapeComposite, rootId: string): AlignLayoutNode[] {
  const root = shapeComposite.mergedShapeTreeMap[rootId];
  const layoutNodes: AlignLayoutNode[] = [];
  flatTree([root]).forEach((t) => {
    const s = shapeComposite.mergedShapeMap[t.id];
    const node = toLayoutNode(shapeComposite, s);
    if (node) {
      layoutNodes.push(node);
    }
  });
  return layoutNodes;
}

export function getNextAlignLayout(shapeComposite: ShapeComposite, rootId: string): { [id: string]: Partial<Shape> } {
  const layoutNodes = toLayoutNodes(shapeComposite, rootId);
  const result = alignLayout(layoutNodes);
  const ret: { [id: string]: Partial<Shape> & Partial<AlignBoxShape> } = {};
  result.forEach((r) => {
    const shape = shapeComposite.shapeMap[r.id];
    let changed = false;
    const patch: Partial<Shape> & Partial<AlignBoxShape> = {};
    if (!isSame(r.rect, shape.p)) {
      patch.p = { x: r.rect.x, y: r.rect.y };
      changed = true;
    }
    if (isAlignBoxShape(shape)) {
      if (r.rect.width !== shape.width) {
        patch.width = r.rect.width;
        changed = true;
      }
      if (r.rect.height !== shape.height) {
        patch.height = r.rect.height;
        changed = true;
      }
      if (shape.rotation !== 0) {
        patch.rotation = 0;
        changed = true;
      }
    }

    if (changed) {
      ret[r.id] = patch;
    }
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
      saveParentBoxes(shapeMap[id]);
      saveUpdatedParentBoxes(updatedShapeMap[id]);
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
