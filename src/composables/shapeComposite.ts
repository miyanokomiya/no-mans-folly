import { IRectangle, IVec2 } from "okageo";
import { Shape } from "../models";
import * as shapeModule from "../shapes";
import * as geometry from "../utils/geometry";
import { findBackward, mergeMap, toMap } from "../utils/commons";
import { flatTree, getAllBranchIds, getTree } from "../utils/tree";
import { ImageStore } from "./imageStore";
import { isGroupShape } from "../shapes/group";
import { ShapeSnappingLines } from "../shapes/core";

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
    return getAllBranchMergedShapes(ids).filter((s) => !isGroupShape(s));
  }

  function render(ctx: CanvasRenderingContext2D, shape: Shape, imageStore?: ImageStore) {
    shapeModule.renderShape(option.getStruct, ctx, shape, mergedShapeContext, imageStore);
  }

  function findShapeAt(p: IVec2, parentId?: string): Shape | undefined {
    const scope = (parentId ? mergedShapeTreeMap[parentId].children : mergedShapeTree).map((t) => mergedShapeMap[t.id]);
    return findBackward(scope, (s) => shapeModule.isPointOn(option.getStruct, s, p, mergedShapeContext));
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
