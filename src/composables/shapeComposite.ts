import { AffineMatrix, IRectangle, IVec2, getRectCenter, multiAffines } from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import * as shapeModule from "../shapes";
import * as geometry from "../utils/geometry";
import { findBackward, mergeMap, toMap } from "../utils/commons";
import { flatTree, getAllBranchIds, getTree } from "../utils/tree";
import { ImageStore } from "./imageStore";
import {
  ShapeSelectionScope,
  ShapeSnappingLines,
  isSameShapeParentScope,
  isSameShapeSelectionScope,
} from "../shapes/core";
import { isGroupShape } from "../shapes/group";

interface Option {
  shapes: Shape[];
  getStruct: shapeModule.GetShapeStruct;
  tmpShapeMap?: { [id: string]: Partial<Shape> };
}

export function newShapeComposite(option: Option) {
  const shapeMap = toMap(option.shapes);
  const mergedShapeMap = option.tmpShapeMap
    ? (mergeMap(shapeMap, option.tmpShapeMap) as { [id: string]: Shape })
    : shapeMap;
  const mergedShapes = option.shapes.map((s) => mergedShapeMap[s.id]);
  const mergedShapeTree = getTree(mergedShapes);
  const mergedShapeTreeMap = toMap(flatTree(mergedShapeTree));

  const mergedShapeContext = {
    shapeMap: mergedShapeMap,
    treeNodeMap: mergedShapeTreeMap,
    getStruct: option.getStruct,
  };

  function getAllBranchMergedShapes(ids: string[]): Shape[] {
    return getAllBranchIds(mergedShapeTree, ids).map((id) => mergedShapeMap[id]);
  }

  function getAllTransformTargets(ids: string[]): Shape[] {
    return getAllBranchMergedShapes(ids);
  }

  function render(ctx: CanvasRenderingContext2D, shape: Shape, imageStore?: ImageStore) {
    shapeModule.renderShape(option.getStruct, ctx, shape, mergedShapeContext, imageStore);
  }

  function findShapeAt(
    p: IVec2,
    scope?: ShapeSelectionScope,
    excludeIds?: string[],
    parentScopeCheckOnly = false,
  ): Shape | undefined {
    const excludeSet = new Set(excludeIds ?? []);
    const candidates = getMergedShapesInSelectionScope(scope, parentScopeCheckOnly);
    const candidate = findBackward(
      candidates,
      (s) => !excludeSet.has(s.id) && shapeModule.isPointOn(option.getStruct, s, p, mergedShapeContext),
    );
    if (!candidate) return;
    if (!shapeModule.isTransparentSelection(option.getStruct, candidate)) return candidate;

    // When the candidate is transparent for selection, try seeking its children.
    const childCandidate = findShapeAt(p, { parentId: candidate.id }, undefined, true);
    return childCandidate ?? candidate;
  }

  function getWrapperRect(shape: Shape, includeBounds?: boolean): IRectangle {
    return shapeModule.getWrapperRect(option.getStruct, shape, mergedShapeContext, includeBounds);
  }

  function getWrapperRectForShapes(shapes: Shape[], includeBounds?: boolean): IRectangle {
    const shapeRects = shapes.map((s) => getWrapperRect(s, includeBounds));
    return geometry.getWrapperRect(shapeRects);
  }

  function getLocalRectPolygon(shape: Shape): IVec2[] {
    return shapeModule.getLocalRectPolygon(option.getStruct, shape, mergedShapeContext);
  }

  function getShapesOverlappingRect(shapes: Shape[], rect: IRectangle): Shape[] {
    const checkFn = geometry.getIsRectHitRectFn(rect);
    return shapes.filter((s) => checkFn(getWrapperRect(s)));
  }

  function getSnappingLines(shape: Shape): ShapeSnappingLines {
    return shapeModule.getSnappingLines(option.getStruct, shape, mergedShapeContext);
  }

  function shouldDelete(shape: Shape): boolean {
    return !!option.getStruct(shape.type).shouldDelete?.(shape, mergedShapeContext);
  }

  function getSelectionScope(shape: Shape): ShapeSelectionScope {
    const struct = option.getStruct(shape.type);
    if (struct.getSelectionScope) {
      return struct.getSelectionScope(shape, mergedShapeContext);
    } else if (mergedShapeContext.shapeMap[shape.parentId ?? ""]) {
      return { parentId: shape.parentId! };
    } else {
      return { parentId: undefined };
    }
  }

  /**
   * When scope is undefined, returns root shapes
   */
  function getMergedShapesInSelectionScope(scope?: ShapeSelectionScope, parentScopeCheckOnly = false): Shape[] {
    if (!scope?.parentId) return mergedShapeTree.map((t) => mergedShapeMap[t.id]);

    const checkFn = parentScopeCheckOnly ? isSameShapeParentScope : isSameShapeSelectionScope;
    return (
      mergedShapeTreeMap[scope.parentId]?.children
        .map((t) => mergedShapeMap[t.id])
        .filter((s) => checkFn(getSelectionScope(s), scope)) ?? []
    );
  }

  return {
    getShapeStruct: option.getStruct,
    shapes: option.shapes,
    shapeMap,
    tmpShapeMap: option.tmpShapeMap ?? {},
    mergedShapes,
    mergedShapeMap,
    mergedShapeTree,
    mergedShapeTreeMap: toMap(flatTree(mergedShapeTree)),
    getAllBranchMergedShapes,
    getAllTransformTargets,

    render,
    findShapeAt,
    getWrapperRect,
    getWrapperRectForShapes,
    getLocalRectPolygon,
    getShapesOverlappingRect,
    getSnappingLines,
    shouldDelete,
    getSelectionScope,
    getMergedShapesInSelectionScope,
  };
}
export type ShapeComposite = ReturnType<typeof newShapeComposite>;

/**
 * "scope.scopeKey" is ignored by this function for better behavior.
 * e.g. When a board column is selected and a user tries to select a card on it, "scopeKey" prevents selecting it.
 * To respect "scopeKye", use "findShapeAt" of ShapeComposite instead.
 */
export function findBetterShapeAt(
  shapeComposite: ShapeComposite,
  p: IVec2,
  scope?: ShapeSelectionScope,
  excludeIds?: string[],
): Shape | undefined {
  if (!scope) return shapeComposite.findShapeAt(p, undefined, excludeIds);

  // Seek in the parent scope
  const result2 = shapeComposite.findShapeAt(p, { parentId: scope.parentId }, excludeIds);
  if (result2) return result2;

  // Lift the scope
  return shapeComposite.findShapeAt(p, undefined, excludeIds);
}

/**
 * Some shapes depend on other shapes, so they should be deleted at the same time.
 * e.g. group shapes that will become empty by deleting children.
 */
export function getDeleteTargetIds(shapeComposite: ShapeComposite, deleteSrc: string[]): string[] {
  const srcSet = new Set(deleteSrc);
  const remainedParentIdSet = new Set(
    shapeComposite.shapes.filter((s) => !srcSet.has(s.id) && s.parentId).map((s) => s.parentId!),
  );

  const deleteParentSet = new Set<string>();
  deleteSrc.forEach((id) => {
    const parentId = shapeComposite.shapeMap[id].parentId;
    if (parentId && isGroupShape(shapeComposite.shapeMap[parentId]) && !remainedParentIdSet.has(parentId)) {
      deleteParentSet.add(parentId);
    }
  });

  return [...deleteSrc, ...deleteParentSet];
}

/**
 * Shapes can be grouped when
 * - Multiple shapes exist as the targets.
 * - No shape in the targets has parent.
 */
export function canGroupShapes(shapeComposite: ShapeComposite, targetIds: string[]): boolean {
  if (targetIds.length < 2) return false;
  const shapeMap = shapeComposite.shapeMap;
  return !targetIds.some((id) => shapeMap[id].parentId);
}

export function getNextShapeComposite(
  shapeComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): ShapeComposite {
  const deletedIdSet = patchInfo.delete ? new Set(patchInfo.delete) : undefined;
  const remainedShapes = deletedIdSet
    ? shapeComposite.shapes.filter((s) => !deletedIdSet!.has(s.id))
    : shapeComposite.shapes;

  const patchedShapes = patchInfo.update
    ? remainedShapes.map((s) => (patchInfo.update![s.id] ? { ...s, ...patchInfo.update![s.id] } : s))
    : remainedShapes;

  const shapes = patchInfo.add ? patchedShapes.concat(patchInfo.add) : patchedShapes;
  shapes.sort((a, b) => (a.findex <= b.findex ? -1 : 1));
  return newShapeComposite({
    shapes,
    getStruct: shapeComposite.getShapeStruct,
  });
}

/**
 * Returns rotated wrapper rect for target shapes.
 */
export function getRotatedTargetBounds(
  shapeComposite: ShapeComposite,
  targetIds: string[],
  boundingRotation: number,
): IVec2[] {
  const shapeMap = shapeComposite.shapeMap;
  const shapes = targetIds.map((id) => shapeMap[id]);
  const wrapperRect = geometry.getWrapperRect(shapes.map((s) => shapeComposite.getWrapperRect(s)));
  const c = getRectCenter(wrapperRect);
  const r = boundingRotation;
  const sin = Math.sin(-r);
  const cos = Math.cos(-r);
  const affine: AffineMatrix = multiAffines([
    [1, 0, 0, 1, c.x, c.y],
    [cos, sin, -sin, cos, 0, 0],
    [1, 0, 0, 1, -c.x, -c.y],
  ]);
  const rotatedWrapperRect = geometry.getWrapperRect(
    shapes
      .map((s) => ({ ...s, ...shapeModule.resizeShape(shapeComposite.getShapeStruct, s, affine) }))
      .map((s) => shapeComposite.getWrapperRect(s)),
  );
  const rotateFn = geometry.getRotateFn(r, c);
  return geometry.getRectPoints(rotatedWrapperRect).map((p) => rotateFn(p));
}
