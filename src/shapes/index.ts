import { AffineMatrix, IRectangle, IVec2, getCenter, getOuterRectangle, multiAffines, sub } from "okageo";
import { CommonStyle, Shape } from "../models";
import { ShapeSnappingLines, ShapeStruct } from "./core";
import { struct as rectangleStruct } from "./rectangle";
import { struct as textStruct } from "./text";
import { struct as ellipseStruct } from "./ellipse";
import { struct as lineStruct } from "./line";
import { struct as imageStruct } from "./image";
import * as geometry from "../utils/geometry";
import { generateKeyBetween } from "fractional-indexing";
import { TreeNode } from "../utils/tree";
import { DocOutput } from "../models/document";
import { mapDataToObj, remap } from "../utils/commons";
import { ImageStore } from "../composables/imageStore";

const SHAPE_STRUCTS: {
  [type: string]: ShapeStruct<any>;
} = {
  rectangle: rectangleStruct,
  text: textStruct,
  ellipse: ellipseStruct,
  line: lineStruct,
  image: imageStruct,
};

export type GetShapeStruct = (type: string) => ShapeStruct<any>;

export const getCommonStruct: GetShapeStruct = (type: string) => {
  return SHAPE_STRUCTS[type];
};

export function createShape<T extends Shape>(getStruct: GetShapeStruct, type: string, arg: Partial<T>): T {
  const struct = getStruct(type);
  return struct.create(arg);
}

export function renderShape<T extends Shape>(
  getStruct: GetShapeStruct,
  ctx: CanvasRenderingContext2D,
  shape: T,
  shapeMap: { [id: string]: T } = {},
  treeNode?: TreeNode,
  imageStore?: ImageStore
) {
  const struct = getStruct(shape.type);
  struct.render(ctx, shape, shapeMap, treeNode, imageStore);
}

export function getWrapperRect(getStruct: GetShapeStruct, shape: Shape, includeBounds?: boolean): IRectangle {
  const struct = getStruct(shape.type);
  return struct.getWrapperRect(shape, includeBounds);
}

export function getLocalRectPolygon(getStruct: GetShapeStruct, shape: Shape): IVec2[] {
  const struct = getStruct(shape.type);
  return struct.getLocalRectPolygon(shape);
}

export function getTextRangeRect(getStruct: GetShapeStruct, shape: Shape): IRectangle | undefined {
  const struct = getStruct(shape.type);
  return struct.getTextRangeRect?.(shape);
}

export function canHaveText(getStruct: GetShapeStruct, shape: Shape): boolean {
  const struct = getStruct(shape.type);
  return !!struct.getTextRangeRect;
}

export function isPointOn(getStruct: GetShapeStruct, shape: Shape, p: IVec2): boolean {
  const struct = getStruct(shape.type);
  return struct.isPointOn(shape, p);
}

export function resizeShape(getStruct: GetShapeStruct, shape: Shape, resizingAffine: AffineMatrix): Partial<Shape> {
  const struct = getStruct(shape.type);
  return struct.resize(shape, resizingAffine);
}

export function getSnappingLines(getStruct: GetShapeStruct, shape: Shape): ShapeSnappingLines {
  const struct = getStruct(shape.type);
  if (struct.getSnappingLines) return struct.getSnappingLines(shape);

  const rect = struct.getWrapperRect(shape);
  const [t, r, b, l] = geometry.getRectLines(rect);
  const [cv, ch] = geometry.getRectCenterLines(rect);
  return {
    v: [l, cv, r],
    h: [t, ch, b],
  };
}

export function getClosestOutline(
  getStruct: GetShapeStruct,
  shape: Shape,
  p: IVec2,
  threshold: number
): IVec2 | undefined {
  const struct = getStruct(shape.type);
  if (struct.getClosestOutline) return struct.getClosestOutline(shape, p, threshold);
}

/**
 * [from, to] is treated as a segment.
 */
export function getIntersectedOutlines(
  getStruct: GetShapeStruct,
  shape: Shape,
  from: IVec2,
  to: IVec2
): IVec2[] | undefined {
  const struct = getStruct(shape.type);
  if (struct.getIntersectedOutlines) return struct.getIntersectedOutlines(shape, from, to);
}

export function getLocationRateOnShape(getStruct: GetShapeStruct, shape: Shape, p: IVec2) {
  return geometry.getLocationRateOnRectPath(getLocalRectPolygon(getStruct, shape), shape.rotation, p);
}

export function getShapeTextBounds(
  getStruct: GetShapeStruct,
  shape: Shape
): {
  affine: AffineMatrix;
  affineReverse: AffineMatrix;
  range: IRectangle;
} {
  const path = getLocalRectPolygon(getStruct, shape);
  const center = getCenter(path[0], path[2]);
  const rotateFn = geometry.getRotateFn(shape.rotation, center);
  const range = getTextRangeRect(getStruct, shape) ?? getOuterRectangle([path.map((p) => rotateFn(p, true))]);

  const width = range.width;
  const height = range.height;
  const sin = Math.sin(shape.rotation);
  const cos = Math.cos(shape.rotation);

  return {
    affine: multiAffines([
      [1, 0, 0, 1, center.x, center.y],
      [cos, sin, -sin, cos, 0, 0],
      [1, 0, 0, 1, -width / 2, -height / 2],
    ]),
    affineReverse: multiAffines([
      [1, 0, 0, 1, width / 2, height / 2],
      [cos, -sin, sin, cos, 0, 0],
      [1, 0, 0, 1, -center.x, -center.y],
    ]),
    range: { x: 0, y: 0, width, height },
  };
}

export function getCommonStyle(getStruct: GetShapeStruct, shape: Shape): CommonStyle | undefined {
  const struct = getStruct(shape.type);
  return struct.getCommonStyle?.(shape);
}

export function updateCommonStyle(getStruct: GetShapeStruct, shape: Shape, val: Partial<CommonStyle>): Partial<Shape> {
  const struct = getStruct(shape.type);
  return struct.updateCommonStyle?.(shape, val) ?? {};
}

export function remapShapeIds(
  getStruct: GetShapeStruct,
  shapes: Shape[],
  generateId: () => string,
  removeNotFound = false
): { shapes: Shape[]; newToOldMap: { [newId: string]: string }; oldToNewMap: { [newId: string]: string } } {
  const newToOldMap: { [id: string]: string } = {};
  const oldToNewMap: { [id: string]: string } = {};

  const newShapes = shapes.map((s) => {
    const id = generateId();
    newToOldMap[id] = s.id;
    oldToNewMap[s.id] = id;
    return { ...s, id };
  });

  const immigratedShapes = newShapes.map((s) => {
    let patch: Partial<Shape> = {};
    if (s.parentId) {
      if (oldToNewMap[s.parentId]) {
        patch = { parentId: oldToNewMap[s.parentId] };
      } else {
        patch = { parentId: undefined };
      }
    }

    const struct = getStruct(s.type);
    if (struct.immigrateShapeIds) {
      patch = { ...patch, ...struct.immigrateShapeIds(s, oldToNewMap, removeNotFound) };
    }

    return { ...s, ...patch };
  });

  return { shapes: immigratedShapes, newToOldMap, oldToNewMap };
}

export function refreshShapeRelations(
  getStruct: GetShapeStruct,
  shapes: Shape[],
  availableIdSet: Set<string>
): { [id: string]: Partial<Shape> } {
  const ret: { [id: string]: Partial<Shape> } = {};

  shapes.forEach((s) => {
    if (s.parentId && !availableIdSet.has(s.parentId)) {
      ret[s.id] = { parentId: undefined };
    }

    const struct = getStruct(s.type);
    if (!struct.refreshRelation) return;

    const patch = struct.refreshRelation(s, availableIdSet);
    if (patch) {
      ret[s.id] = ret[s.id] ? { ...ret[s.id], ...patch } : patch;
    }
  });

  return ret;
}

export function getWrapperRectForShapes(
  getStruct: GetShapeStruct,
  shapes: Shape[],
  includeBounds?: boolean
): IRectangle {
  const shapeRects = shapes.map((s) => getWrapperRect(getStruct, s, includeBounds));
  return geometry.getWrapperRect(shapeRects);
}

export function patchShapesOrderToLast(shapeIds: string[], lastIndex: string): { [id: string]: Partial<Shape> } {
  let findex = lastIndex;
  return shapeIds.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
    findex = generateKeyBetween(findex, null);
    p[id] = { findex };
    return p;
  }, {});
}

export function patchShapesOrderToFirst(shapeIds: string[], firstIndex: string): { [id: string]: Partial<Shape> } {
  let findex = firstIndex;
  return shapeIds.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
    findex = generateKeyBetween(null, findex);
    p[id] = { findex };
    return p;
  }, {});
}

export function cloneShapes(getStruct: GetShapeStruct, shapes: Shape[], generateId: () => string): Shape[] {
  const cloned = JSON.parse(JSON.stringify(shapes)) as Shape[];
  return remapShapeIds(getStruct, cloned, generateId, true).shapes;
}

export function filterShapesOverlappingRect(getStruct: GetShapeStruct, shapes: Shape[], rect: IRectangle): Shape[] {
  const checkFn = geometry.getIsRectHitRectFn(rect);
  return shapes.filter((s) => checkFn(getWrapperRect(getStruct, s)));
}

export function canAttachSmartBranch(getStruct: GetShapeStruct, shape: Shape): boolean {
  const struct = getStruct(shape.type);
  return !!struct.canAttachSmartBranch;
}

export function duplicateShapes(
  shapes: Shape[],
  docs: [id: string, doc: DocOutput][],
  generateUuid: () => string,
  lastFIndex: string,
  availableIdSet: Set<string>,
  p?: IVec2
): { shapes: Shape[]; docMap: { [id: string]: DocOutput } } {
  const remapInfo = remapShapeIds(getCommonStruct, shapes, generateUuid, true);
  const remapDocs = remap(mapDataToObj(docs), remapInfo.newToOldMap);
  const moved = p ? shiftShapesAtTopLeft(remapInfo.shapes, p) : remapInfo.shapes;
  const patch = patchShapesOrderToLast(
    moved.map((s) => s.id),
    lastFIndex
  );

  let result: Shape[] = moved.map((s) => ({ ...s, ...patch[s.id] }));

  const nextAvailableIdSet = new Set(availableIdSet);
  result.forEach((s) => nextAvailableIdSet.add(s.id));

  const refreshed = refreshShapeRelations(getCommonStruct, result, nextAvailableIdSet);
  result = result.map((s) => ({ ...s, ...(refreshed[s.id] ?? {}) }));

  return {
    shapes: result,
    docMap: remapDocs,
  };
}

function shiftShapesAtTopLeft(shapes: Shape[], targetP: IVec2): Shape[] {
  const rect = getWrapperRectForShapes(getCommonStruct, shapes);
  const d = sub(targetP, rect);

  const affine: AffineMatrix = [1, 0, 0, 1, d.x, d.y];
  const moved = shapes.map((s) => {
    const patch = resizeShape(getCommonStruct, s, affine);
    return { ...s, ...patch };
  });

  return moved;
}
