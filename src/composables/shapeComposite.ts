import { IRectangle, IVec2 } from "okageo";
import { Shape } from "../models";
import * as shapeModule from "../shapes";
import * as geometry from "../utils/geometry";
import { findBackward, mergeMap, toMap } from "../utils/commons";
import { flatTree, getAllBranchIds, getTree } from "../utils/tree";
import { ImageStore } from "./imageStore";
import { ShapeSnappingLines } from "../shapes/core";
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

  function findShapeAt(p: IVec2, parentId?: string): Shape | undefined {
    const scope = (parentId ? mergedShapeTreeMap[parentId].children : mergedShapeTree).map((t) => mergedShapeMap[t.id]);
    const candidate = findBackward(scope, (s) => shapeModule.isPointOn(option.getStruct, s, p, mergedShapeContext));
    if (!candidate) return;
    if (!shapeModule.isTransparentSelection(option.getStruct, candidate)) return candidate;

    // When the candidate is transparent for selection, try seeking its children.
    const childCandidate = findShapeAt(p, candidate.id);
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
  };
}
export type ShapeComposite = ReturnType<typeof newShapeComposite>;

export function findBetterShapeAt(shapeComposite: ShapeComposite, p: IVec2, parentId?: string): Shape | undefined {
  if (!parentId) return shapeComposite.findShapeAt(p);

  // Seek in the scope, then seek without the scope.
  return shapeComposite.findShapeAt(p, parentId) ?? shapeComposite.findShapeAt(p);
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
