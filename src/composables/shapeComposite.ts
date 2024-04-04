import { AffineMatrix, IRectangle, IVec2, getRectCenter, multiAffines } from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import * as shapeModule from "../shapes";
import * as geometry from "../utils/geometry";
import { findBackward, mergeMap, toMap } from "../utils/commons";
import { flatTree, getAllBranchIds, getBranchPath, getTree } from "../utils/tree";
import { ImageStore } from "./imageStore";
import {
  ShapeSelectionScope,
  ShapeSnappingLines,
  isSameShapeParentScope,
  isSameShapeSelectionScope,
} from "../shapes/core";
import { isGroupShape } from "../shapes/group";
import { DocCompositionInfo } from "../utils/textEditor";
import { SVGElementInfo } from "../utils/svgElements";
import { generateNKeysBetween } from "fractional-indexing";
import { generateKeyBetweenAllowSame } from "../utils/findex";
import { newObjectWeakCache } from "./cache";

interface Option {
  shapes: Shape[];
  getStruct: shapeModule.GetShapeStruct;
  tmpShapeMap?: { [id: string]: Partial<Shape> };
}

const cacheMap = newObjectWeakCache<
  Shape,
  {
    wrapperRect: IRectangle;
    "wrapperRect:bounds": IRectangle;
    localRectPolygon: IVec2[];
  }
>();

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

  const docCompositeCacheMap: { [id: string]: DocCompositionInfo } = {};

  function getAllBranchMergedShapes(ids: string[]): Shape[] {
    return getAllBranchIds(mergedShapeTree, ids).map((id) => mergedShapeMap[id]);
  }

  /**
   * Order of the returned value is unstable.
   */
  function getAllTransformTargets(ids: string[], ignoreUnbound = false): Shape[] {
    // Pick shapes declared "unboundChildren" and exclude their children.
    const unboundParents: Shape[] = [];
    const filteredIds = ignoreUnbound
      ? ids.filter((id) => {
          const s = mergedShapeMap[id];
          if (option.getStruct(s.type).unboundChildren) {
            unboundParents.push(s);
            return false;
          }
          return true;
        })
      : ids;

    // Pick all shapes from branches.
    const branchShapes = getAllBranchMergedShapes(filteredIds);
    return [...unboundParents, ...branchShapes];
  }

  function render(ctx: CanvasRenderingContext2D, shape: Shape, imageStore?: ImageStore) {
    shapeModule.renderShape(option.getStruct, ctx, shape, mergedShapeContext, imageStore);
  }

  function createSVGElementInfo(shape: Shape, imageStore?: ImageStore): SVGElementInfo | undefined {
    return shapeModule.createSVGElementInfo(option.getStruct, shape, mergedShapeContext, imageStore);
  }

  function findShapeAt(
    p: IVec2,
    scope?: ShapeSelectionScope,
    excludeIds?: string[],
    parentScopeCheckOnly = false,
    scale = 1,
  ): Shape | undefined {
    const excludeSet = new Set(excludeIds ?? []);
    const candidates = getMergedShapesInSelectionScope(scope, parentScopeCheckOnly);
    const candidate = findBackward(
      candidates,
      (s) => !excludeSet.has(s.id) && shapeModule.isPointOn(option.getStruct, s, p, mergedShapeContext, scale),
    );
    if (!candidate) return;
    if (!excludeSet.has(candidate.id) && !shapeModule.isTransparentSelection(option.getStruct, candidate))
      return candidate;

    // When the candidate is transparent for selection, try seeking its children.
    const childCandidate = findShapeAt(p, { parentId: candidate.id }, excludeIds, true, scale);
    return childCandidate ?? candidate;
  }

  function isPointOn(shape: Shape, p: IVec2): boolean {
    return shapeModule.isPointOn(option.getStruct, shape, p, mergedShapeContext);
  }

  function transformShape<T extends Shape>(shape: T, resizingAffine: AffineMatrix): Partial<T> {
    return shapeModule.resizeShape(option.getStruct, shape, resizingAffine, mergedShapeContext);
  }

  function getWrapperRect(shape: Shape, includeBounds?: boolean): IRectangle {
    return cacheMap.getValue(shape, includeBounds ? "wrapperRect:bounds" : "wrapperRect", () => {
      return shapeModule.getWrapperRect(option.getStruct, shape, mergedShapeContext, includeBounds);
    });
  }

  function getWrapperRectForShapes(shapes: Shape[], includeBounds?: boolean): IRectangle {
    const shapeRects = shapes.map((s) => getWrapperRect(s, includeBounds));
    return geometry.getWrapperRect(shapeRects);
  }

  function getLocalRectPolygon(shape: Shape): IVec2[] {
    return cacheMap.getValue(shape, "localRectPolygon", () => {
      return shapeModule.getLocalRectPolygon(option.getStruct, shape, mergedShapeContext);
    });
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

  function getShapeActualPosition(shape: Shape): IVec2 {
    return option.getStruct(shape.type).getActualPosition?.(shape, mergedShapeContext) ?? shape.p;
  }

  function hasParent(shape: Shape): boolean {
    return !!shapeMap[shape.parentId ?? ""];
  }

  function setDocCompositeCache(id: string, val: DocCompositionInfo) {
    docCompositeCacheMap[id] = val;
  }

  function getDocCompositeCache(id: string): DocCompositionInfo | undefined {
    return docCompositeCacheMap[id];
  }

  function getShapeCompositeWithoutTmpInfo(): ShapeComposite {
    return newShapeComposite({
      getStruct: option.getStruct,
      shapes: option.shapes,
    });
  }

  function getSubShapeComposite(ids: string[]): ShapeComposite {
    const allIds = getAllBranchIds(mergedShapeTree, ids);
    return newShapeComposite({
      getStruct: option.getStruct,
      shapes: allIds.map((id) => shapeMap[id]),
    });
  }

  return {
    getShapeStruct: option.getStruct,
    shapes: option.shapes,
    shapeMap,
    tmpShapeMap: option.tmpShapeMap ?? {},
    mergedShapes,
    mergedShapeMap,
    mergedShapeTree,
    mergedShapeTreeMap,
    getAllBranchMergedShapes,
    getAllTransformTargets,

    render,
    createSVGElementInfo,
    findShapeAt,
    isPointOn,
    transformShape,
    getWrapperRect,
    getWrapperRectForShapes,
    getLocalRectPolygon,
    getShapesOverlappingRect,
    getSnappingLines,
    shouldDelete,
    getSelectionScope,
    getMergedShapesInSelectionScope,
    getShapeActualPosition,
    hasParent,

    setDocCompositeCache,
    getDocCompositeCache,

    getShapeCompositeWithoutTmpInfo,
    getSubShapeComposite,
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
  scale = 1,
): Shape | undefined {
  if (!scope) return shapeComposite.findShapeAt(p, undefined, excludeIds, undefined, scale);

  // Seek in the parent scope
  const result2 = shapeComposite.findShapeAt(p, { parentId: scope.parentId }, excludeIds, undefined, scale);
  if (result2) return result2;

  // Lift the scope
  return shapeComposite.findShapeAt(p, undefined, excludeIds, undefined, scale);
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
      .map((s) => ({ ...s, ...shapeComposite.transformShape(s, affine) }))
      .map((s) => shapeComposite.getWrapperRect(s)),
  );
  const rotateFn = geometry.getRotateFn(r, c);
  return geometry.getRectPoints(rotatedWrapperRect).map((p) => rotateFn(p));
}

export function getClosestShapeByType<T extends Shape>(
  shapeComposite: ShapeComposite,
  targetId: string,
  type: string,
): T | undefined {
  const path = getBranchPath(shapeComposite.mergedShapeTreeMap, targetId);
  const id = findBackward(path, (id) => {
    const shape = shapeComposite.mergedShapeMap[id];
    return shape.type === type;
  });
  return id ? (shapeComposite.mergedShapeMap[id] as T) : undefined;
}

/**
 * Suppose the swapping is valid.
 */
export function swapShapeParent(
  shapeComposite: ShapeComposite,
  targetId: string,
  toId: string,
  operation: "group" | "above" | "below",
  generateUuid: () => string,
): EntityPatchInfo<Shape> {
  const target = shapeComposite.shapeMap[targetId];
  const to = shapeComposite.shapeMap[toId];
  const targetParent = target.parentId ? shapeComposite.shapeMap[target.parentId] : undefined;
  const toParent = to.parentId ? shapeComposite.shapeMap[to.parentId] : undefined;

  const ret: EntityPatchInfo<Shape> = {};

  if (operation === "group") {
    if (isGroupShape(to)) {
      const toTree = shapeComposite.mergedShapeTreeMap[toId];
      const lastSiblingTree = toTree.children.length > 0 ? toTree.children[toTree.children.length - 1] : undefined;
      if (lastSiblingTree) {
        const lastSibling = shapeComposite.shapeMap[lastSiblingTree.id];
        ret.update = {
          [targetId]: { parentId: to.id, findex: generateKeyBetweenAllowSame(lastSibling.findex, null) },
        };
      } else {
        ret.update = {
          [targetId]: { parentId: to.id },
        };
      }
    } else {
      const group = shapeModule.createShape(shapeComposite.getShapeStruct, "group", {
        id: generateUuid(),
        parentId: to.parentId,
        findex: to.findex,
      });

      const findexList = generateNKeysBetween(null, null, 2);
      ret.add = [group];
      ret.update = {
        [toId]: { parentId: group.id, findex: findexList[0] },
        [targetId]: { parentId: group.id, findex: findexList[1] },
      };
    }
  } else if (toParent) {
    const toParentTree = shapeComposite.mergedShapeTreeMap[toParent.id];

    switch (operation) {
      case "above": {
        const aboveIndex = toParentTree.children.findIndex((c) => c.id === toId);
        const aboveTree = aboveIndex >= 1 ? toParentTree.children[aboveIndex - 1] : undefined;
        const above = aboveTree ? shapeComposite.shapeMap[aboveTree.id] : undefined;
        const findex = generateKeyBetweenAllowSame(above?.findex ?? null, to.findex);
        ret.update = { [targetId]: { parentId: to.parentId, findex } };
        break;
      }
      case "below": {
        const belowIndex = toParentTree.children.findIndex((c) => c.id === toId);
        const belowTree =
          belowIndex < toParentTree.children.length - 1 ? toParentTree.children[belowIndex + 1] : undefined;
        const below = belowTree ? shapeComposite.shapeMap[belowTree.id] : undefined;
        const findex = generateKeyBetweenAllowSame(to.findex, below?.findex ?? null);
        ret.update = { [targetId]: { parentId: to.parentId, findex } };
        break;
      }
    }
  } else {
    const roots = shapeComposite.mergedShapeTree;

    switch (operation) {
      case "above": {
        const aboveIndex = roots.findIndex((c) => c.id === toId);
        const aboveTree = aboveIndex >= 1 ? roots[aboveIndex - 1] : undefined;
        const above = aboveTree ? shapeComposite.shapeMap[aboveTree.id] : undefined;
        const findex = generateKeyBetweenAllowSame(above?.findex ?? null, to.findex);
        ret.update = { [targetId]: { parentId: to.parentId, findex } };
        break;
      }
      case "below": {
        const belowIndex = roots.findIndex((c) => c.id === toId);
        const belowTree = belowIndex < roots.length - 1 ? roots[belowIndex + 1] : undefined;
        const below = belowTree ? shapeComposite.shapeMap[belowTree.id] : undefined;
        const findex = generateKeyBetweenAllowSame(to.findex, below?.findex ?? null);
        ret.update = { [targetId]: { parentId: to.parentId, findex } };
        break;
      }
    }
  }

  if (targetParent) {
    const targetParentTree = shapeComposite.mergedShapeTreeMap[targetParent.id];
    if (targetParentTree.children.length <= 1) {
      ret.delete = [targetParentTree.id];
    }
  }

  return ret;
}
