import {
  AffineMatrix,
  IRectangle,
  IVec2,
  MINVALUE,
  applyAffine,
  getCenter,
  getDistance,
  getOuterRectangle,
  getRectCenter,
  multiAffines,
} from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import * as shapeModule from "../shapes";
import * as geometry from "../utils/geometry";
import { findBackward, mergeMap, toMap } from "../utils/commons";
import { flatTree, getAllBranchIds, getBranchPath, getParentRefMap, getTree, TreeNode } from "../utils/tree";
import { ImageStore } from "./imageStore";
import {
  LineJumpMap,
  ShapeContext,
  ShapeSelectionScope,
  ShapeSnappingLines,
  isSameShapeParentScope,
  isSameShapeSelectionScope,
} from "../shapes/core";
import { isGroupShape } from "../shapes/group";
import { DocCompositionInfo } from "../utils/textEditor";
import { SVGElementInfo } from "../utils/svgElements";
import { compareByFindex, generateNKeysBetweenAllowSame } from "../utils/findex";
import { newCache, newObjectWeakCache } from "../utils/stateful/cache";
import { DocOutput } from "../models/document";
import { getLineJumpMap } from "../shapes/utils/lineJump";
import { isLineShape } from "../shapes/line";
import { shouldEntityOrderUpdate, shouldEntityTreeUpdate } from "../utils/entities";
import { CanvasCTX } from "../utils/types";
import { BezierPath } from "../utils/path";

interface Option {
  shapes: Shape[];
  getStruct: shapeModule.GetShapeStruct;
  tmpShapeMap?: { [id: string]: Partial<Shape> };
  // This option must be equivalent to one derived from shapes.
  shapeTreeInfo?: ShapeTreeInfo;
}

type ShapeTreeInfo = {
  mergedShapeTree: TreeNode[];
  mergedShapeTreeMap: { [id: string]: TreeNode };
  parentRefMap: Map<string, string>;
};

export function newShapeComposite(option: Option) {
  // This cache has to be within this scope.
  // Some shapes such as groups depend on other shapes to derive their bounds,
  // so using those intances as keys aren't sufficient to take this cache over composites.
  const cacheMap = newObjectWeakCache<
    Shape,
    {
      wrapperRect: IRectangle;
      "wrapperRect:bounds": IRectangle;
      localRectPolygon: IVec2[];
      outlineWrapperRect: IRectangle[];
      highlightPaths: BezierPath[] | undefined;
    }
  >();

  const getStruct = option.getStruct;
  const tmpShapeMap = option.tmpShapeMap;

  // Regard and sever circular parent references here.
  // Be careful that original shapes still keep those references.
  const { shapes: srcShapes, parentRefMap } = severCircularParentRefs(
    option.shapes,
    option.shapeTreeInfo?.parentRefMap,
  );

  const shapeMap = toMap(srcShapes);
  const mergedShapeMap = tmpShapeMap ? (mergeMap(shapeMap, tmpShapeMap) as { [id: string]: Shape }) : shapeMap;
  const mergedShapes = srcShapes.map((s) => mergedShapeMap[s.id]);
  const mergedShapeTree = option.shapeTreeInfo?.mergedShapeTree ?? getTree(mergedShapes);
  const mergedShapeTreeMap = option.shapeTreeInfo?.mergedShapeTreeMap ?? toMap(flatTree(mergedShapeTree));
  // shape context always refers to merged shapes.
  const mergedShapeContext = newShapeContext(getStruct, mergedShapes, mergedShapeMap, mergedShapeTreeMap);

  const docCompositeCacheMap: { [id: string]: [info: DocCompositionInfo, src: DocOutput] } = {};

  const sortedMergedShapeTreeCache = newCache(() => {
    return mergedShapeTree.toSorted(
      (a, b) =>
        shapeModule.getOrderPriority(option.getStruct, mergedShapeMap[a.id]) -
        shapeModule.getOrderPriority(option.getStruct, mergedShapeMap[b.id]),
    );
  });
  const getSortedMergedShapeTree = sortedMergedShapeTreeCache.getValue;

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
          if (getStruct(s.type).unboundChildren) {
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

  function render(ctx: CanvasCTX, shape: Shape, imageStore?: ImageStore) {
    shapeModule.renderShape(getStruct, ctx, shape, mergedShapeContext, imageStore);
  }

  function clip(shape: Shape): Path2D | undefined {
    return shapeModule.clipShape(getStruct, shape, mergedShapeContext);
  }

  function createSVGElementInfo(shape: Shape, imageStore?: ImageStore): SVGElementInfo | undefined {
    return shapeModule.createSVGElementInfo(getStruct, shape, mergedShapeContext, imageStore);
  }

  function createClipSVGPath(shape: Shape): string | undefined {
    return shapeModule.createClipSVGPath(getStruct, shape, mergedShapeContext);
  }

  function findShapeAt(
    p: IVec2,
    scope?: ShapeSelectionScope,
    excludeIds?: string[],
    parentScopeCheckOnly = false,
    scale = 1,
    anyParent = false,
  ): Shape | undefined {
    const excludeSet = new Set(excludeIds ?? []);
    const candidates = getMergedShapesInSelectionScope(scope, parentScopeCheckOnly, anyParent);
    const candidate = findBackward(
      candidates,
      (s) => !excludeSet.has(s.id) && shapeModule.isPointOn(getStruct, s, p, mergedShapeContext, scale),
    );
    if (!candidate) return;
    if (!excludeSet.has(candidate.id) && !shapeModule.isTransparentSelection(getStruct, candidate)) return candidate;

    // When the candidate is transparent for selection, try seeking its children.
    const childCandidate = findShapeAt(p, { parentId: candidate.id }, excludeIds, true, scale);
    return childCandidate ?? candidate;
  }

  function isPointOn(shape: Shape, p: IVec2): boolean {
    return shapeModule.isPointOn(getStruct, shape, p, mergedShapeContext);
  }

  function isPointOnOutline(shape: Shape, p: IVec2): boolean {
    return !!shapeModule.getClosestOutline(getStruct, shape, p, MINVALUE, MINVALUE);
  }

  function transformShape<T extends Shape>(shape: T, resizingAffine: AffineMatrix): Partial<T> {
    return shapeModule.resizeShape(getStruct, shape, resizingAffine, mergedShapeContext);
  }

  /**
   * Derive wrapper rect of the shape based on its bounding box.
   */
  function getWrapperRect(shape: Shape, includeBounds?: boolean): IRectangle {
    return cacheMap.getValue(shape, includeBounds ? "wrapperRect:bounds" : "wrapperRect", () => {
      return shapeModule.getWrapperRect(getStruct, shape, mergedShapeContext, includeBounds);
    });
  }

  /**
   * Derive wrapper rect of the shape based on its bounding box.
   */
  function getWrapperRectForShapes(shapes: Shape[], includeBounds?: boolean): IRectangle {
    const shapeRects = shapes.map((s) => getWrapperRect(s, includeBounds));
    return geometry.getWrapperRect(shapeRects);
  }

  /**
   * Derive wrapper rect of the shape based on its outline.
   */
  function getOutlineWrapperRect(shape: Shape): IRectangle {
    return cacheMap.getValue(shape, "outlineWrapperRect", () => {
      const outlines = shapeModule.getOutlinePaths(getStruct, shape);
      if (!outlines || outlines.length === 0) return getWrapperRect(shape);

      const rects = outlines.map((path) => geometry.getCurveSplineBounds(path.path, path.curves));
      return geometry.getWrapperRect(rects);
    });
  }

  function getLocalRectPolygon(shape: Shape): IVec2[] {
    return cacheMap.getValue(shape, "localRectPolygon", () => {
      return shapeModule.getLocalRectPolygon(getStruct, shape, mergedShapeContext);
    });
  }

  function getLocalSpace(shape: Shape): [IRectangle, rotation: number] {
    const localRectPolygon = getLocalRectPolygon(shape);
    const c = getCenter(localRectPolygon[0], localRectPolygon[2]);
    const width = getDistance(localRectPolygon[0], localRectPolygon[1]);
    const height = getDistance(localRectPolygon[0], localRectPolygon[3]);
    return [{ x: c.x - width / 2, y: c.y - height / 2, width, height }, shape.rotation];
  }

  function getLocationRateOnShape(shape: Shape, p: IVec2): IVec2 {
    return geometry.getLocationRateOnRectPath(getLocalRectPolygon(shape), shape.rotation, p);
  }

  /**
   * Returns wrapper rect of the tree shapes.
   * This rect has local location based on the shape.
   */
  function getShapeTreeLocalRect(shape: Shape): IRectangle {
    const rootLocalRect = geometry.getRectWithRotationFromRectPolygon(getLocalRectPolygon(shape));
    const t = geometry.getRotatedRectAffineInverse(rootLocalRect[0], rootLocalRect[1]);
    const points = getAllBranchMergedShapes([shape.id]).map((s) =>
      getLocalRectPolygon(s).map((p) => applyAffine(t, p)),
    );
    return getOuterRectangle(points);
  }

  function getHighlightPaths(shape: Shape): BezierPath[] {
    const paths = cacheMap.getValue(shape, "highlightPaths", () => {
      return shapeModule.getHighlightPaths(getStruct, shape, true);
    });
    if (paths) return paths;
    const localRect = getLocalRectPolygon(shape);
    return [{ path: [...localRect, localRect[0]], curves: [] }];
  }

  function rotateShapeTree(targetId: string, nextRotation: number): { [id: string]: Partial<Shape> } {
    const root = mergedShapeMap[targetId];
    const wrapperRect = getWrapperRect(root);
    const c = getRectCenter(wrapperRect);
    const t = geometry.getRotatedAtAffine(c, nextRotation - root.rotation);
    const ret: { [id: string]: Partial<Shape> } = {};
    getAllBranchMergedShapes([targetId]).forEach((s) => {
      ret[s.id] = transformShape(shapeMap[s.id], t);
    });
    return ret;
  }

  /**
   * Returns shapes that are overlapping with the rect.
   * `includesBounds` is set true on calculating shape bounds.
   */
  function getShapesOverlappingRect(shapes: Shape[], rect: IRectangle): Shape[] {
    const checkFn = geometry.getIsRectHitRectFn(rect);
    return shapes.filter((s) => checkFn(getWrapperRect(s, true)));
  }

  function getSnappingLines(shape: Shape): ShapeSnappingLines {
    return shapeModule.getSnappingLines(getStruct, shape, mergedShapeContext);
  }

  function shouldDelete(shape: Shape): boolean {
    return !!getStruct(shape.type).shouldDelete?.(shape, mergedShapeContext);
  }

  function getSelectionScope(shape: Shape): ShapeSelectionScope {
    const struct = getStruct(shape.type);
    if (struct.getSelectionScope) {
      return struct.getSelectionScope(shape, mergedShapeContext);
    } else if (mergedShapeContext.shapeMap[shape.parentId ?? ""]) {
      return { parentId: shape.parentId! };
    } else {
      return { parentId: undefined };
    }
  }

  /**
   * When "anyParent" is set true, scope.parent is ignored and parents of shapes don't matter to filtering.
   */
  function getMergedShapesInSelectionScope(
    scope?: ShapeSelectionScope,
    parentScopeCheckOnly = false,
    anyParent = false,
  ): Shape[] {
    let candidates: Shape[];
    if (anyParent) {
      candidates = srcShapes
        .map((s) => mergedShapeMap[s.id])
        .filter((s) => getSelectionScope(s).scopeKey === scope?.scopeKey);
    } else if (!scope) {
      const shapeSet = new Set<Shape>();
      getSortedMergedShapeTree().forEach((t) => {
        const s = mergedShapeMap[t.id];
        shapeSet.add(s);
        if (shapeModule.isTransparentSelection(getStruct, s)) {
          t.children.forEach((ct) => {
            shapeSet.add(mergedShapeMap[ct.id]);
          });
        }
      });
      candidates = Array.from(shapeSet);
    } else if (!scope.parentId) {
      candidates = getSortedMergedShapeTree().map((t) => mergedShapeMap[t.id]);
    } else {
      const checkFn = parentScopeCheckOnly ? isSameShapeParentScope : isSameShapeSelectionScope;
      candidates =
        mergedShapeTreeMap[scope.parentId]?.children
          .map((t) => mergedShapeMap[t.id])
          .filter((s) => checkFn(getSelectionScope(s), scope)) ?? [];
    }

    return scope?.shapeType ? candidates.filter((s) => s.type === scope.shapeType) : candidates;
  }

  function getShapeActualPosition(shape: Shape): IVec2 {
    return getStruct(shape.type).getActualPosition?.(shape, mergedShapeContext) ?? shape.p;
  }

  function getRectPolygonForLayout(shape: Shape): IVec2[] {
    const struct = getStruct(shape.type);
    return (
      struct.getRectPolygonForLayout?.(shape, mergedShapeContext) ??
      struct.getLocalRectPolygon(shape, mergedShapeContext)
    );
  }

  function hasParent(shape: Shape): shape is Shape & Required<Pick<Shape, "parentId">> {
    return !!shapeMap[shape.parentId ?? ""];
  }

  function attached(shape: Shape): shape is Shape & Required<Pick<Shape, "attachment">> {
    return !!shapeMap[shape.attachment?.id ?? ""];
  }

  function canAttach(shape: Shape): boolean {
    if (shapeModule.hasSpecialOrderPriority(getStruct, shape)) return false;
    if (isLineShape(shape)) return false;
    if (!hasParent(shape)) return true;
    // When the parent isn't group shape, it must be special layout shape.
    // => This shape should follow its layout rule rather than attachment.
    return isGroupShape(shapeMap[shape.parentId]);
  }

  function setDocCompositeCache(id: string, val: DocCompositionInfo, src: DocOutput) {
    docCompositeCacheMap[id] = [val, src];
  }

  // When "src" is passed, returns cache only when its source matches the "src".
  // Note: Doc composite denepds on both a shape and its doc that can change respectively.
  // => This cache has to regard both of them.
  // When "src" isn't passed, just returns cache without checking its source.
  function getDocCompositeCache(id: string, src?: DocOutput): DocCompositionInfo | undefined {
    const cache = docCompositeCacheMap[id];
    if (!cache) return;

    return !src || cache[1] === src ? cache[0] : undefined;
  }

  function getShapeCompositeWithoutTmpInfo(): ShapeComposite {
    return newShapeComposite({
      getStruct,
      shapes: option.shapes,
    });
  }

  function getSubShapeComposite(ids: string[], update?: { [id: string]: Partial<Shape> }): ShapeComposite {
    const allIds = getAllBranchIds(mergedShapeTree, ids);
    const shouldSort = shouldEntityOrderUpdate({ update });
    const shouldResetTree = shouldSort || shouldEntityTreeUpdate({ update }, (_, patch) => "parentId" in patch);

    let shapeTreeInfo: ShapeTreeInfo | undefined;
    if (!shouldResetTree) {
      const allIdSet = new Set(allIds);
      shapeTreeInfo = {
        mergedShapeTree: ids.filter((id) => allIdSet.has(id)).map((id) => mergedShapeTreeMap[id]),
        mergedShapeTreeMap: allIds.reduce<{ [id: string]: TreeNode }>((p, id) => {
          p[id] = mergedShapeTreeMap[id];
          return p;
        }, {}),
        parentRefMap: parentRefMap,
      };
    }

    return newShapeComposite({
      getStruct,
      shapes: allIds.map((id) => {
        const s = shapeMap[id];
        const v = update?.[id];
        return v ? { ...s, ...v } : s;
      }),
      shapeTreeInfo,
    });
  }

  /**
   * Returns [root parent, ..., direct parent]
   */
  function getBranchPathTo(id: string): string[] {
    const ret: string[] = [];
    let current = parentRefMap.get(id);
    while (current) {
      ret.unshift(current);
      current = parentRefMap.get(current);
    }
    return ret;
  }

  return {
    getShapeStruct: getStruct,
    shapes: srcShapes,
    shapeMap,
    tmpShapeMap: tmpShapeMap ?? {},
    mergedShapes,
    mergedShapeMap,
    mergedShapeTree,
    mergedShapeTreeMap,
    getAllBranchMergedShapes,
    getAllTransformTargets,
    parentRefMap,
    getSortedMergedShapeTree,

    render,
    clip,
    createSVGElementInfo,
    createClipSVGPath,

    findShapeAt,
    isPointOn,
    isPointOnOutline,
    transformShape,
    getWrapperRect,
    getWrapperRectForShapes,
    getOutlineWrapperRect,
    getLocalRectPolygon,
    getLocalSpace,
    getLocationRateOnShape,
    getShapeTreeLocalRect,
    getHighlightPaths,
    rotateShapeTree,
    getShapesOverlappingRect,
    getSnappingLines,
    shouldDelete,
    getSelectionScope,
    getMergedShapesInSelectionScope,
    getShapeActualPosition,
    getRectPolygonForLayout,
    hasParent,
    attached,
    canAttach,
    getBranchPathTo,

    setDocCompositeCache,
    getDocCompositeCache,

    getShapeCompositeWithoutTmpInfo,
    getSubShapeComposite,
  };
}
export type ShapeComposite = ReturnType<typeof newShapeComposite>;

function newShapeContext(
  getStruct: shapeModule.GetShapeStruct,
  shapes: Shape[],
  shapeMap: { [id: string]: Shape },
  shapeTreeMap: { [id: string]: TreeNode },
): ShapeContext {
  let lineJumpMap: LineJumpMap;
  return {
    shapeMap: shapeMap,
    treeNodeMap: shapeTreeMap,
    getStruct,
    get lineJumpMap() {
      if (!lineJumpMap) {
        lineJumpMap = getLineJumpMap(shapes.filter((s) => isLineShape(s)));
      }
      return lineJumpMap;
    },
  };
}

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
  // Seek with no scope
  const result3 = shapeComposite.findShapeAt(p, undefined, excludeIds, undefined, scale);

  if (result2 && result3) {
    // Pick result3 when result2 isn't in any branch of it.
    const result2BranchPath = shapeComposite.getBranchPathTo(result2.id);
    return result2BranchPath.includes(result3.id) ? result2 : result3;
  }

  return result2 ?? result3;
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
 * - No shape in the targets has parents other than the same group shape.
 * - All targets can be grouped.
 */
export function canGroupShapes(shapeComposite: ShapeComposite, targetIds: string[]): boolean {
  if (targetIds.length < 2) return false;

  // Check if all targets have the same group shape as the parent.
  let indexParentId = shapeComposite.shapeMap[targetIds[0]]?.parentId;
  const indexParent = indexParentId ? shapeComposite.shapeMap[indexParentId] : undefined;
  if (!indexParent || !isGroupShape(indexParent)) {
    indexParentId = undefined;
  }

  return !targetIds.some((id) => {
    const s = shapeComposite.shapeMap[id];
    if (!shapeModule.canShapeGrouped(shapeComposite.getShapeStruct, s)) return true;
    if (!shapeComposite.hasParent(s)) return false;
    return s.parentId !== indexParentId;
  });
}

export function getNextShapeComposite(
  shapeComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): ShapeComposite {
  const deletedIdSet = patchInfo.delete ? new Set(patchInfo.delete) : undefined;
  const remainedShapes = deletedIdSet
    ? shapeComposite.shapes.filter((s) => !deletedIdSet!.has(s.id))
    : shapeComposite.shapes;

  const updateMap = patchInfo.update;
  const patchedShapes = updateMap
    ? remainedShapes.map((s) => {
        const patch = updateMap[s.id];
        return patch ? { ...s, ...patch } : s;
      })
    : remainedShapes;

  const shapes = patchInfo.add ? patchedShapes.concat(patchInfo.add) : patchedShapes;

  const shouldSort = shouldEntityOrderUpdate(patchInfo);
  const shouldResetTree = shouldSort || shouldEntityTreeUpdate(patchInfo, (_, patch) => "parentId" in patch);

  if (shouldSort) {
    shapes.sort(compareByFindex);
  }

  return newShapeComposite({
    shapes,
    getStruct: shapeComposite.getShapeStruct,
    shapeTreeInfo: shouldResetTree
      ? undefined
      : {
          mergedShapeTree: shapeComposite.mergedShapeTree,
          mergedShapeTreeMap: shapeComposite.mergedShapeTreeMap,
          parentRefMap: shapeComposite.parentRefMap,
        },
  });
}

export function replaceTmpShapeMapOfShapeComposite(
  shapeComposite: ShapeComposite,
  tmpShapeMap: { [id: string]: Partial<Shape> },
): ShapeComposite {
  const shouldResetTree = shouldEntityTreeUpdate({ update: tmpShapeMap }, (_, patch) => "parentId" in patch);

  return newShapeComposite({
    shapes: shapeComposite.shapes,
    tmpShapeMap,
    getStruct: shapeComposite.getShapeStruct,
    shapeTreeInfo: shouldResetTree
      ? undefined
      : {
          mergedShapeTree: shapeComposite.mergedShapeTree,
          mergedShapeTreeMap: shapeComposite.mergedShapeTreeMap,
          parentRefMap: shapeComposite.parentRefMap,
        },
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
  const rotatedWrapperRect = getOuterRectangle(
    shapes.map((s) => shapeComposite.getLocalRectPolygon(s)).map((points) => points.map((p) => applyAffine(affine, p))),
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
 * Assumptions
 * - The swapping is valid.
 * - All targets are in the same selection scope.
 */
export function swapShapeParent(
  shapeComposite: ShapeComposite,
  targetIds: string[],
  toId: string,
  operation: "group" | "above" | "below" | "adopt",
  generateUuid: () => string,
): EntityPatchInfo<Shape> {
  if (targetIds.length <= 0) return {};

  const sortedTargets = targetIds.map((id) => shapeComposite.shapeMap[id]).sort(compareByFindex);
  const sortedTargetIds = sortedTargets.map((s) => s.id);
  const target = sortedTargets[0];
  const to = shapeComposite.shapeMap[toId];
  const toParent = to.parentId ? shapeComposite.shapeMap[to.parentId] : undefined;
  const ret: EntityPatchInfo<Shape> = {};

  function makeLastChild() {
    const toTree = shapeComposite.mergedShapeTreeMap[toId];
    const lastSiblingTree = toTree.children.at(-1);
    const lastSibling = lastSiblingTree ? shapeComposite.shapeMap[lastSiblingTree.id] : undefined;
    const findexList = generateNKeysBetweenAllowSame(lastSibling?.findex, null, sortedTargetIds.length);
    ret.update = sortedTargetIds.reduce<typeof ret.update>((p, id, i) => {
      p![id] = { parentId: to.id, findex: findexList[i] };
      return p;
    }, {});
  }

  if (operation === "group") {
    if (isGroupShape(to)) {
      makeLastChild();
    } else {
      const group = shapeModule.createShape(shapeComposite.getShapeStruct, "group", {
        id: generateUuid(),
        parentId: to.parentId,
        findex: to.findex,
      });

      const findexList = generateNKeysBetweenAllowSame(null, null, sortedTargetIds.length + 1);
      ret.add = [group];
      ret.update = sortedTargetIds.reduce<typeof ret.update>(
        (p, id, i) => {
          p![id] = { parentId: group.id, findex: findexList[i + 1] };
          return p;
        },
        {
          [toId]: { parentId: group.id, findex: findexList[0] },
        },
      );
    }
  } else if (operation === "adopt") {
    makeLastChild();
  } else {
    const siblings = toParent
      ? shapeComposite.mergedShapeTreeMap[toParent.id].children
      : shapeComposite.mergedShapeTree;

    let findexList: string[];
    switch (operation) {
      case "above": {
        const aboveIndex = siblings.findIndex((c) => c.id === toId);
        const aboveTree = aboveIndex >= 1 ? siblings[aboveIndex - 1] : undefined;
        const above = aboveTree ? shapeComposite.shapeMap[aboveTree.id] : undefined;
        findexList = generateNKeysBetweenAllowSame(above?.findex ?? null, to.findex, sortedTargetIds.length);
        break;
      }
      default: {
        const belowIndex = siblings.findIndex((c) => c.id === toId);
        const belowTree = belowIndex < siblings.length - 1 ? siblings[belowIndex + 1] : undefined;
        const below = belowTree ? shapeComposite.shapeMap[belowTree.id] : undefined;
        findexList = generateNKeysBetweenAllowSame(to.findex, below?.findex ?? null, sortedTargetIds.length);
        break;
      }
    }

    ret.update = sortedTargetIds.reduce<typeof ret.update>((p, id, i) => {
      p![id] = { parentId: to.parentId, findex: findexList[i] };
      return p;
    }, {});
  }

  // Check if this operation changes the tree structure.
  // If not, discard the update.
  const nextSC = getNextShapeComposite(shapeComposite, ret);
  const currentSiblings = toParent
    ? shapeComposite.mergedShapeTreeMap[toParent.id].children
    : shapeComposite.mergedShapeTree;
  const nextSiblings = toParent ? nextSC.mergedShapeTreeMap[toParent.id].children : nextSC.mergedShapeTree;
  if (currentSiblings.map((t) => t.id).join(",") === nextSiblings.map((t) => t.id).join(",")) return {};

  // Delete the target parent if it no longer has children.
  const targetParent = target.parentId ? shapeComposite.shapeMap[target.parentId] : undefined;
  if (targetParent) {
    const targetParentTree = shapeComposite.mergedShapeTreeMap[targetParent.id];
    if (targetParentTree.children.length <= 1) {
      ret.delete = [targetParentTree.id];
    }
  }

  return ret;
}

function severCircularParentRefs(
  src: Shape[],
  parentRefMapCache?: Map<string, string>,
): { shapes: Shape[]; parentRefMap: Map<string, string> } {
  const parentRefMap = parentRefMapCache ?? getParentRefMap(src);
  return {
    shapes: src.map((s) => (s.parentId && !parentRefMap.has(s.id) ? { ...s, parentId: undefined } : s)),
    parentRefMap,
  };
}

export function getAllShapeRangeWithinComposite(shapeComposite: ShapeComposite, includeBounds?: boolean) {
  const shapeMap = shapeComposite.mergedShapeMap;
  return shapeComposite.getWrapperRectForShapes(
    shapeComposite.mergedShapeTree.map((t) => shapeMap[t.id]),
    includeBounds,
  );
}
