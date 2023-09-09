import { AffineMatrix, IRectangle, IVec2, getCenter, getDistance, getOuterRectangle, multiAffines } from "okageo";
import { CommonStyle, Shape } from "../models";
import { ShapeSnappingLines, ShapeStruct } from "./core";
import { struct as rectangleStruct } from "./rectangle";
import { struct as ellipseStruct } from "./ellipse";
import { struct as lineStruct } from "./line";
import * as geometry from "../utils/geometry";
import { generateKeyBetween } from "fractional-indexing";

const SHAPE_STRUCTS: {
  [type: string]: ShapeStruct<any>;
} = {
  rectangle: rectangleStruct,
  ellipse: ellipseStruct,
  line: lineStruct,
};

export type GetShapeStruct = (type: string) => ShapeStruct<any>;

export const getCommonStruct: GetShapeStruct = (type: string) => {
  return SHAPE_STRUCTS[type];
};

export function createShape<T extends Shape>(getStruct: GetShapeStruct, type: string, arg: Partial<T>): T {
  const struct = getStruct(type);
  return struct.create(arg);
}

export function renderShape<T extends Shape>(getStruct: GetShapeStruct, ctx: CanvasRenderingContext2D, shape: T) {
  const struct = getStruct(shape.type);
  struct.render(ctx, shape);
}

export function getWrapperRect(getStruct: GetShapeStruct, shape: Shape): IRectangle {
  const struct = getStruct(shape.type);
  return struct.getWrapperRect(shape);
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
export function getClosestIntersectedOutline(
  getStruct: GetShapeStruct,
  shape: Shape,
  from: IVec2,
  to: IVec2
): IVec2 | undefined {
  const struct = getStruct(shape.type);
  if (struct.getClosestIntersectedOutline) return struct.getClosestIntersectedOutline(shape, from, to);
}

export function getLocationRateOnShape(getStruct: GetShapeStruct, shape: Shape, p: IVec2) {
  return geometry.getLocationRateOnRectPath(getLocalRectPolygon(getStruct, shape), shape.rotation, p);
}

export function getShapeAffine(getStruct: GetShapeStruct, shape: Shape) {
  const path = getLocalRectPolygon(getStruct, shape);
  const width = getDistance(path[0], path[1]);
  const height = getDistance(path[0], path[3]);
  const center = getCenter(path[0], path[2]);
  const sin = Math.sin(shape.rotation);
  const cos = Math.cos(shape.rotation);

  return multiAffines([
    [1, 0, 0, 1, center.x, center.y],
    [cos, sin, -sin, cos, 0, 0],
    [1, 0, 0, 1, -width / 2, -height / 2],
  ]);
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
    const struct = getStruct(s.type);
    if (!struct.immigrateShapeIds) return s;

    const patch = struct.immigrateShapeIds(s, oldToNewMap, removeNotFound);
    return { ...s, ...patch };
  });

  return { shapes: immigratedShapes, newToOldMap, oldToNewMap };
}

export function getWrapperRectForShapes(getStruct: GetShapeStruct, shapes: Shape[]): IRectangle {
  const shapeRects = shapes.map((s) => getWrapperRect(getStruct, s));
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
