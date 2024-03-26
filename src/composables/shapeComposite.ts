import {
  AffineMatrix,
  IRectangle,
  IVec2,
  applyAffine,
  getCenter,
  getOuterRectangle,
  getRectCenter,
  multiAffines,
} from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import * as shapeModule from "../shapes";
import * as geometry from "../utils/geometry";
import { findBackward, mergeMap, toMap } from "../utils/commons";
import { flatTree, getAllBranchIds, getBranchPath, getTree, walkTreeWithValue } from "../utils/tree";
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

export function resizeShapeTrees(
  shapeComposite: ShapeComposite,
  targetIds: string[],
  affine: AffineMatrix,
): { [id: string]: Partial<Shape> } {
  const shapeMap = shapeComposite.shapeMap;
  const targetTrees = targetIds.map((id) => shapeComposite.mergedShapeTreeMap[id]);
  const allBranchIds = shapeComposite.getAllBranchMergedShapes(targetIds).map((s) => s.id);
  const allBranchShsapes = allBranchIds.map((id) => shapeMap[id]);

  const minShapeComposite = newShapeComposite({
    getStruct: shapeComposite.getShapeStruct,
    shapes: allBranchShsapes,
  });

  const srcInfoMap: { [id: string]: { localPolygon: IVec2[] } } = {};

  const rowResizedList = allBranchIds.map<[Shape, Partial<Shape>]>((id) => {
    const s = shapeMap[id];
    srcInfoMap[id] = { localPolygon: minShapeComposite.getLocalRectPolygon(s) };
    const patch = minShapeComposite.transformShape(s, affine);
    return [{ ...s, ...patch }, patch];
  });

  const resizedComposite = newShapeComposite({
    getStruct: minShapeComposite.getShapeStruct,
    shapes: rowResizedList.map(([s]) => s),
  });

  const rowResizedInfoMap: { [id: string]: { localPolygon: IVec2[]; shape: Shape; patch: Partial<Shape> } } = {};

  rowResizedList.forEach(([resized, patch]) => {
    rowResizedInfoMap[resized.id] = {
      localPolygon: resizedComposite.getLocalRectPolygon(resized),
      shape: resized,
      patch,
    };
  });

  const ret: { [id: string]: Partial<Shape> } = {};

  walkTreeWithValue<
    | {
        affine: AffineMatrix;
        parentResizedRotationAffine: AffineMatrix;
        parentDerotationAffine: AffineMatrix;
        parentDerotationResizedAffine: AffineMatrix;
        parentDerotatedRect: IRectangle;
        parentDerotatedResizedRect: IRectangle;
      }
    | { inheritedAffine: AffineMatrix }
    | undefined
  >(
    targetTrees,
    (node, _, data) => {
      const shape = shapeMap[node.id];

      if (data && "inheritedAffine" in data) {
        const patch = minShapeComposite.transformShape(shape, data.inheritedAffine);
        ret[node.id] = patch;
        return data;
      }

      const resizingAffine = data?.affine ?? affine;
      const localPolygon = srcInfoMap[shape.id].localPolygon;
      const center = getCenter(localPolygon[0], localPolygon[2]);

      const rowResizedInfo = rowResizedInfoMap[shape.id];
      const resizedLocalPolygon = localPolygon.map((p) => applyAffine(resizingAffine, p));
      const resizedCenter = getCenter(resizedLocalPolygon[0], resizedLocalPolygon[2]);

      if (!data) {
        ret[node.id] = rowResizedInfo.patch;
        if (!isGroupShape(shape)) return;

        const rotationResizedAffine = geometry.getRotatedAtAffine(resizedCenter, shape.rotation);

        const derotationAffine = geometry.getRotatedAtAffine(center, -shape.rotation);
        const derotationResizedAffine = geometry.getRotatedAtAffine(resizedCenter, -shape.rotation);

        const derotatedRect = minShapeComposite.getWrapperRect({ ...shape, rotation: 0 });
        const derotatedResizedRect = getOuterRectangle([
          resizedLocalPolygon.map((p) => applyAffine(derotationResizedAffine, p)),
        ]);

        return {
          affine: resizingAffine,
          parentResizedRotationAffine: rotationResizedAffine,
          parentDerotationAffine: derotationAffine,
          parentDerotationResizedAffine: derotationResizedAffine,
          parentDerotatedRect: derotatedRect,
          parentDerotatedResizedRect: derotatedResizedRect,
        };
      }

      const normalizedSrcRect = getOuterRectangle([
        localPolygon.map((p) => applyAffine(data.parentDerotationAffine, p)),
      ]);

      const normalizedResizedRect = getOuterRectangle([
        resizedLocalPolygon.map((p) => applyAffine(data.parentDerotationResizedAffine, p)),
      ]);

      const adjustmentAffines: AffineMatrix[] = [];

      if (shape.gcV === 1) {
        const targetTopMargin = normalizedSrcRect.y - data.parentDerotatedRect.y;
        const resizedTopMargin = normalizedResizedRect.y - data.parentDerotatedResizedRect.y;
        const diff = targetTopMargin - resizedTopMargin;
        adjustmentAffines.push(
          multiAffines([
            [1, 0, 0, 1, 0, diff + normalizedResizedRect.y],
            [1, 0, 0, (normalizedResizedRect.height - diff) / normalizedResizedRect.height, 0, 0],
            [1, 0, 0, 1, 0, -normalizedResizedRect.y],
          ]),
        );
      } else if (shape.gcV === 2) {
        const targetHeight = normalizedSrcRect.height;
        adjustmentAffines.push(
          multiAffines([
            [1, 0, 0, 1, 0, resizedCenter.y],
            [1, 0, 0, targetHeight / normalizedResizedRect.height, 0, 0],
            [1, 0, 0, 1, 0, -resizedCenter.y],
          ]),
        );
      }

      const adjustmentAffine: AffineMatrix = multiAffines([
        data.parentResizedRotationAffine,
        ...adjustmentAffines,
        data.parentDerotationResizedAffine,
      ]);

      const adjustmentPatch = resizedComposite.transformShape(rowResizedInfo.shape, adjustmentAffine);

      ret[node.id] = { ...rowResizedInfo.patch, ...adjustmentPatch };

      const adjustedLocalPolygon = resizedLocalPolygon.map((p) => applyAffine(adjustmentAffine, p));
      const adjustedCenter = getCenter(adjustedLocalPolygon[0], adjustedLocalPolygon[2]);

      if (isGroupShape(shape)) {
        const rotationResizedAffine = geometry.getRotatedAtAffine(adjustedCenter, shape.rotation);

        const derotationAffine = geometry.getRotatedAtAffine(center, -shape.rotation);
        const derotationResizedAffine = geometry.getRotatedAtAffine(adjustedCenter, -shape.rotation);

        const derotatedRect = minShapeComposite.getWrapperRect({ ...shape, rotation: 0 });
        const derotatedResizedRect = getOuterRectangle([
          adjustedLocalPolygon.map((p) => applyAffine(derotationResizedAffine, p)),
        ]);

        return {
          affine: resizingAffine,
          parentResizedRotationAffine: rotationResizedAffine,
          parentDerotationResizedAffine: derotationResizedAffine,
          parentDerotatedRect: derotatedRect,
          parentDerotatedResizedRect: derotatedResizedRect,
          parentDerotationAffine: derotationAffine,
        };
      }

      return { inheritedAffine: multiAffines([adjustmentAffine, resizingAffine]) };
    },
    undefined,
  );

  return ret;
}
