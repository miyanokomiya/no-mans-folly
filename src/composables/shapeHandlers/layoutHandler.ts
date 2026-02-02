import { AffineMatrix, getRectCenter, isZero, IVec2, multiAffines, sub } from "okageo";
import { EntityPatchInfo, Shape } from "../../models";
import { hasSpecialOrderPriority } from "../../shapes";
import { isAlignBoxShape } from "../../shapes/align/alignBox";
import { isGroupShape } from "../../shapes/group";
import { isLineShape } from "../../shapes/line";
import { isTableShape } from "../../shapes/table/table";
import { isVNNodeShape } from "../../shapes/vectorNetworks/vnNode";
import { isObjectEmpty, mapEach, toMap } from "../../utils/commons";
import { getRotatedAtAffine } from "../../utils/geometry";
import { LayoutFn, LayoutNode } from "../../utils/layouts/core";
import { getBranchPath } from "../../utils/tree";
import { getClosestShapeByTypes, ShapeComposite } from "../shapeComposite";
import { DependencyMap, topSortHierarchy } from "../../utils/graph";

export function isGeneralLayoutShape(shape: Shape): boolean {
  return isAlignBoxShape(shape) || isTableShape(shape);
}

export function canJoinGeneralLayout(shapeComposite: ShapeComposite, shape: Shape): boolean {
  if (hasSpecialOrderPriority(shapeComposite.getShapeStruct, shape)) return false;
  // It may be better to let shape structs decide whether the shape can be joined or not.
  // But for now, there's not so many shape types that should be excluded.
  if (isLineShape(shape) || isVNNodeShape(shape)) return false;
  if (!shape.parentId) return true;

  const parent = shapeComposite.shapeMap[shape.parentId];
  if (!parent) return true;

  return isAlignBoxShape(parent) || isTableShape(parent) || isGroupShape(parent);
}

/**
 * Check if all shapes can be joined to the same layout.
 */
export function canShapesJoinGeneralLayout(shapeComposite: ShapeComposite, shapes: Shape[]): boolean {
  if (shapes.length === 0) return false;
  // Check individual shapes.
  if (shapes.some((shape) => !canJoinGeneralLayout(shapeComposite, shape))) return false;

  // Check if all shapes have no parent or the same parent.
  const indexParentId = shapeComposite.hasParent(shapes[0]) ? shapes[0].parentId : undefined;
  if (indexParentId) {
    return shapes.every((shape) => shape.parentId === indexParentId);
  } else {
    return shapes.every((shape) => !shapeComposite.hasParent(shape));
  }
}

export function getClosestLayoutShapeAt(shapeComposite: ShapeComposite, shapeId: string): Shape | undefined {
  return getClosestShapeByTypes(shapeComposite, shapeId, ["align_box", "table"]);
}

export function getModifiedLayoutRootIds(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
  isLayoutShape: (s: Shape) => boolean,
) {
  const targetRootIdSet = new Set<string>();
  const deletedRootIdSet = new Set<string>();

  const shapeMap = srcComposite.shapeMap;
  const updatedShapeMap = updatedComposite.shapeMap;

  const saveParentBoxes = (s: Shape) => {
    // Seek the shallowest layout shape.
    getBranchPath(srcComposite.mergedShapeTreeMap, s.id).some((id) => {
      if (isLayoutShape(shapeMap[id])) {
        targetRootIdSet.add(id);
        return true;
      }
    });
  };

  const saveUpdatedParentBoxes = (s: Shape) => {
    // Seek the shallowest layout shape.
    getBranchPath(updatedComposite.mergedShapeTreeMap, s.id).some((id) => {
      if (isLayoutShape(updatedShapeMap[id])) {
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
        if (isLayoutShape(shapeMap[id])) {
          return true;
        }
      });

      const nextAlignId = getBranchPath(updatedComposite.mergedShapeTreeMap, id).find((id) => {
        if (isLayoutShape(updatedShapeMap[id])) {
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
      if (!shape) return;

      if (isLayoutShape(shape)) {
        deletedRootIdSet.add(id);
      }
      saveParentBoxes(shape);
    });
  }

  return Array.from(targetRootIdSet).filter((id) => !deletedRootIdSet.has(id));
}

/**
 * "positionDiff" represents the vector from the location of the wrapper rectangle of the shape to the location of the shape.
 * When a shape has children but doesn't accommodate them (e.g. tree_root), the wrapper rectangle doesn't always represent the shape.
 * => The layout result for the wrapper rectangle needs to be adjusted to apply it to the shape.
 */
export type LayoutNodeWithMeta<T extends LayoutNode> = T & { positionDiff?: IVec2 };

export function getNextLayout<T extends LayoutNode>(
  shapeComposite: ShapeComposite,
  rootId: string,
  layoutNodes: LayoutNodeWithMeta<T>[],
  layoutFn: LayoutFn<T>,
): { [id: string]: Partial<Shape> } {
  const rootShape = shapeComposite.mergedShapeMap[rootId];
  const layoutNodeMap = toMap(layoutNodes);
  const result = layoutFn(layoutNodes);

  const rootRotateAffine =
    rootShape.rotation !== 0
      ? getRotatedAtAffine(getRectCenter(layoutNodeMap[rootId].rect), rootShape.rotation)
      : undefined;
  const ret: { [id: string]: Partial<Shape> } = {};
  result.forEach((r) => {
    const s = shapeComposite.shapeMap[r.id];
    const srcNode = layoutNodeMap[r.id];
    const v = sub(r.rect, srcNode.rect);
    const affines: AffineMatrix[] = [];
    if (rootRotateAffine) {
      affines.push(rootRotateAffine);
    }
    if (!isZero(v)) {
      affines.push([1, 0, 0, 1, v.x, v.y]);
    }
    if (r.rect.width !== srcNode.rect.width || r.rect.height !== srcNode.rect.height) {
      affines.push(
        [1, 0, 0, 1, srcNode.rect.x, srcNode.rect.y],
        [r.rect.width / srcNode.rect.width, 0, 0, r.rect.height / srcNode.rect.height, 0, 0],
        [1, 0, 0, 1, -srcNode.rect.x, -srcNode.rect.y],
      );
    }
    if (s.rotation !== 0) {
      affines.push(getRotatedAtAffine(getRectCenter(srcNode.rect), -s.rotation));
    }
    if (affines.length === 0) return;

    const affine = multiAffines(affines);
    if (s.id === rootId) {
      let val: Partial<Shape>;
      if (isAlignBoxShape(s)) {
        const v = shapeComposite.transformShape(s, affine);
        // "baseWidth" and "baseHeight" shouldn't be changed by layout logic.
        delete v.baseWidth;
        delete v.baseHeight;
        val = v;
      } else {
        val = shapeComposite.transformShape(s, affine);
      }

      if (!isObjectEmpty(val)) {
        ret[s.id] = val;
      }
    } else {
      // Need to deal with all children as well when the shape isn't layout box.
      shapeComposite.getAllTransformTargets([s.id]).forEach((target) => {
        const val = shapeComposite.transformShape(target, affine);
        if (!isObjectEmpty(val)) {
          ret[target.id] = val;
        }
      });
    }
  });

  return ret;
}

/**
 * When "isStableLayoutShape" returns true, the shape only activates the closest layout shape in the branch tree.
 * => Because they don't change their bounds depending on their children. e.g. table
 */
export function getModifiedLayoutIdsInOrder(
  srcComposite: ShapeComposite,
  nextComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
  isLayoutShape: (s: Shape) => boolean,
  isConstraintLayoutShape?: (s: Shape) => boolean,
): string[][] {
  const depMap: DependencyMap = new Map();

  const saveLayoutByShapeComposite = (id: string, sc: ShapeComposite) => {
    if (!sc.mergedShapeMap[id]) return;

    // Get branch path based on the specified composite
    const branchPath = getBranchPath(sc.mergedShapeTreeMap, id);
    let layoutBranchPath = branchPath.filter((branchId) => {
      // Always use "nextComposite" to check if the shape exists and is a layout one
      const branchShape = nextComposite.shapeMap[branchId];
      return branchShape && isLayoutShape(branchShape);
    });

    const tail = layoutBranchPath.at(-1);
    if (!tail) return;

    if (isConstraintLayoutShape) {
      collectConstraintChildLayoutIds(depMap, nextComposite, isConstraintLayoutShape, id);
    }

    layoutBranchPath.forEach((branchId, i) => {
      let deps = depMap.get(branchId);
      if (!deps) {
        deps = new Set();
        depMap.set(branchId, deps);
      }
      if (layoutBranchPath[i + 1]) {
        deps.add(layoutBranchPath[i + 1]);
      }
    });
  };

  mapEach(patchInfo.update ?? {}, (_, id) => {
    saveLayoutByShapeComposite(id, srcComposite);
    saveLayoutByShapeComposite(id, nextComposite);
  });
  patchInfo.add?.forEach((s) => {
    saveLayoutByShapeComposite(s.id, nextComposite);
  });
  patchInfo.delete?.forEach((id) => {
    saveLayoutByShapeComposite(id, srcComposite);
  });

  const sorted = topSortHierarchy(depMap);
  return sorted;
}

export function collectConstraintChildLayoutIds(
  depMap: DependencyMap,
  sc: ShapeComposite,
  isConstraintLayoutShape: (s: Shape) => boolean,
  targetId: string,
) {
  const target = sc.shapeMap[targetId];
  if (!isConstraintLayoutShape(target)) return [];

  sc.mergedShapeTreeMap[targetId].children.forEach((ct) => {
    const child = sc.shapeMap[ct.id];
    const localParent = child.parentId ? sc.shapeMap[child.parentId] : undefined;
    if (localParent && isConstraintLayoutShape(localParent) && (child.lcH || child.lcV)) {
      let deps = depMap.get(targetId);
      if (!deps) {
        deps = new Set();
        depMap.set(targetId, deps);
      }
      deps.add(child.id);
      depMap.set(child.id, new Set());
      collectConstraintChildLayoutIds(depMap, sc, isConstraintLayoutShape, child.id);
    }
  });
}
