import { AffineMatrix, IRectangle, IVec2, getOuterRectangle, getRectCenter, multiAffines } from "okageo";
import { BoxPadding, CommonStyle, Shape, ShapeAttachment, Size } from "../models";
import {
  GetShapeStruct as _GetShapeStruct,
  createBaseShape,
  hasFillStyle,
  hasStrokeStyle,
  ShapeContext,
  ShapeSnappingLines,
  TextContainer,
} from "./core";
import { struct as unknownStruct } from "./unknown";
import * as geometry from "../utils/geometry";
import { ImageStore } from "../composables/imageStore";
import { getPaddingRect } from "../utils/boxPadding";
import { SVGElementInfo } from "../utils/svgElements";
import { SHAPE_COMMON_STRUCTS } from "./commonStructs";
import { generateKeyBetween } from "../utils/findex";
import { isObjectEmpty } from "../utils/commons";
import { PartialProperties, patchByPartialProperties } from "../utils/entities";

export type GetShapeStruct = _GetShapeStruct;

export const getCommonStruct: GetShapeStruct = (type: string) => {
  return SHAPE_COMMON_STRUCTS[type] ?? unknownStruct;
};

export function createShape<T extends Shape>(getStruct: GetShapeStruct, type: string, arg: Partial<T>): T {
  const struct = getStruct(type);
  return struct.create(arg);
}

export function renderShape<T extends Shape>(
  getStruct: GetShapeStruct,
  ctx: CanvasRenderingContext2D,
  shape: T,
  shapeContext: ShapeContext,
  imageStore?: ImageStore,
) {
  const struct = getStruct(shape.type);
  struct.render(ctx, shape, shapeContext, imageStore);
}

export function clipShape(getStruct: GetShapeStruct, shape: Shape, shapeContext: ShapeContext): Path2D | undefined {
  const struct = getStruct(shape.type);
  return struct.getClipPath?.(shape, shapeContext);
}

export function canClip(getStruct: GetShapeStruct, shape: Shape): boolean {
  const struct = getStruct(shape.type);
  return !!struct.getClipPath;
}

export function createSVGElementInfo<T extends Shape>(
  getStruct: GetShapeStruct,
  shape: T,
  shapeContext: ShapeContext,
  imageStore?: ImageStore,
): SVGElementInfo | undefined {
  const struct = getStruct(shape.type);
  return struct.createSVGElementInfo?.(shape, shapeContext, imageStore);
}

export function createClipSVGPath<T extends Shape>(
  getStruct: GetShapeStruct,
  shape: T,
  shapeContext: ShapeContext,
): string | undefined {
  const struct = getStruct(shape.type);
  return struct.createClipSVGPath?.(shape, shapeContext);
}

export function getWrapperRect(
  getStruct: GetShapeStruct,
  shape: Shape,
  shapeContext?: ShapeContext,
  includeBounds?: boolean,
): IRectangle {
  const struct = getStruct(shape.type);
  return struct.getWrapperRect(shape, shapeContext, includeBounds);
}

export function getLocalRectPolygon(getStruct: GetShapeStruct, shape: Shape, shapeContext?: ShapeContext): IVec2[] {
  const struct = getStruct(shape.type);
  return struct.getLocalRectPolygon(shape, shapeContext);
}

export function getTextRangeRect(getStruct: GetShapeStruct, shape: Shape): IRectangle | undefined {
  const struct = getStruct(shape.type);

  // Take care of "outer" option of the text padding here for convenience.
  // TODO: Do it in each shape struce.
  const textPadding: BoxPadding | undefined = (shape as any).textPadding;
  if (textPadding?.boundsType === "outer") {
    // This wrapper rect isn't always correct because some shape types require whole shape trees to derive their bounds,
    const rect = struct.getWrapperRect(shape);
    return getPaddingRect(textPadding, rect);
  }

  return struct.getTextRangeRect?.(shape);
}

export function getTextPadding(getStruct: GetShapeStruct, shape: Shape): BoxPadding | undefined {
  const struct = getStruct(shape.type);
  return struct.getTextPadding?.(shape);
}

export function patchTextPadding(getStruct: GetShapeStruct, shape: Shape, value: BoxPadding): Partial<Shape> {
  const struct = getStruct(shape.type);
  return struct.patchTextPadding?.(shape, value) ?? {};
}

export function canHaveText(getStruct: GetShapeStruct, shape: Shape): boolean {
  const struct = getStruct(shape.type);
  return !!struct.getTextRangeRect;
}

export function canHaveTextPadding(getStruct: GetShapeStruct, shape: Shape): boolean {
  const struct = getStruct(shape.type);
  return !!struct.getTextPadding && !!struct.patchTextPadding;
}

export function isPointOn(
  getStruct: GetShapeStruct,
  shape: Shape,
  p: IVec2,
  shapeContext: ShapeContext,
  scale = 1,
): boolean {
  const struct = getStruct(shape.type);
  return struct.isPointOn(shape, p, shapeContext, scale);
}

export function isTransparentSelection(getStruct: GetShapeStruct, shape: Shape): boolean {
  const struct = getStruct(shape.type);
  return !!struct.transparentSelection;
}

/**
 * This function doesn't regard shape trees unless "shapeContext" is provided.
 */
export function resizeShape<T extends Shape>(
  getStruct: GetShapeStruct,
  shape: T,
  resizingAffine: AffineMatrix,
  shapeContext?: ShapeContext,
): Partial<T> {
  const struct = getStruct(shape.type);
  return struct.resize(shape, resizingAffine, shapeContext);
}

export function resizeOnTextEdit(
  getStruct: GetShapeStruct,
  shape: Shape,
  textBoxSize: Size,
): Partial<Shape> | undefined {
  const struct = getStruct(shape.type);
  return struct.resizeOnTextEdit?.(shape, textBoxSize);
}

/**
 * Returned "maxWidth" refers to the eventual text box width including the text padding.
 */
export function shouldResizeOnTextEdit(getStruct: GetShapeStruct, shape: Shape): { maxWidth?: number } | undefined {
  const struct = getStruct(shape.type);
  if (!struct.resizeOnTextEdit) return undefined;

  const maxWidth = (shape as TextContainer).maxWidth ?? getTextRangeRect(getStruct, shape)?.width;
  const textPadding = (shape as TextContainer).textPadding;
  if (textPadding) {
    const poly = getLocalRectPolygon(getStruct, shape);
    const width = poly[1].x - poly[0].x;
    const prect = getPaddingRect(textPadding, { x: 0, y: 0, width, height: 100 });
    const wDiff = width - prect.width;
    return { maxWidth: (maxWidth ?? width) - wDiff };
  } else {
    return { maxWidth };
  }
}

export function getSnappingLines(
  getStruct: GetShapeStruct,
  shape: Shape,
  shapeContext?: ShapeContext,
): ShapeSnappingLines {
  const struct = getStruct(shape.type);
  if (struct.getSnappingLines) return struct.getSnappingLines(shape);

  const rect = struct.getWrapperRect(shape, shapeContext);
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
  threshold: number,
  thresholdForMarker?: number,
): IVec2 | undefined {
  const struct = getStruct(shape.type);
  if (struct.getClosestOutline) return struct.getClosestOutline(shape, p, threshold, thresholdForMarker);
}

export function getTangentAt(getStruct: GetShapeStruct, shape: Shape, p: IVec2): number {
  const struct = getStruct(shape.type);
  return struct.getTangentAt?.(shape, p) ?? 0;
}

/**
 * [from, to] is treated as a segment.
 */
export function getIntersectedOutlines(
  getStruct: GetShapeStruct,
  shape: Shape,
  from: IVec2,
  to: IVec2,
): IVec2[] | undefined {
  const struct = getStruct(shape.type);
  if (struct.getIntersectedOutlines) return struct.getIntersectedOutlines(shape, from, to);
}

export function getShapeTextBounds(
  getStruct: GetShapeStruct,
  shape: Shape,
): {
  affine: AffineMatrix;
  affineReverse: AffineMatrix;
  range: IRectangle;
} {
  const rect = getWrapperRect(getStruct, shape);
  const center = getRectCenter(rect);
  const rotateFn = geometry.getRotateFn(shape.rotation, center);
  const range =
    getTextRangeRect(getStruct, shape) ??
    getOuterRectangle([getLocalRectPolygon(getStruct, shape).map((p) => rotateFn(p, true))]);

  const sin = Math.sin(shape.rotation);
  const cos = Math.cos(shape.rotation);
  const dx = center.x - range.x;
  const dy = center.y - range.y;

  return {
    affine: multiAffines([
      [1, 0, 0, 1, center.x, center.y],
      [cos, sin, -sin, cos, 0, 0],
      [1, 0, 0, 1, -dx, -dy],
    ]),
    affineReverse: multiAffines([
      [1, 0, 0, 1, dx, dy],
      [cos, -sin, sin, cos, 0, 0],
      [1, 0, 0, 1, -center.x, -center.y],
    ]),
    range: { x: 0, y: 0, width: range.width, height: range.height },
  };
}

export function getCommonStyle(getStruct: GetShapeStruct, shape: Shape): CommonStyle | undefined {
  const struct = getStruct(shape.type);
  return struct.getCommonStyle?.(shape);
}

export function updateCommonStyle(
  getStruct: GetShapeStruct,
  shape: Shape,
  val: PartialProperties<CommonStyle>,
): Partial<Shape> {
  const struct = getStruct(shape.type);
  return struct.updateCommonStyle?.(shape, patchByPartialProperties(shape as Shape & CommonStyle, val)) ?? {};
}

export function remapShapeIds(
  getStruct: GetShapeStruct,
  shapes: Shape[],
  generateId: () => string,
  removeNotFound = false,
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
        patch.parentId = oldToNewMap[s.parentId];
      } else if (removeNotFound) {
        patch.parentId = undefined;
      }
    }
    if (s.attachment?.id) {
      if (oldToNewMap[s.attachment.id]) {
        patch.attachment = { ...s.attachment, id: oldToNewMap[s.attachment.id] };
      } else if (removeNotFound) {
        patch.attachment = undefined;
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
  availableIdSet: Set<string>,
): { [id: string]: Partial<Shape> } {
  const ret: { [id: string]: Partial<Shape> } = {};

  shapes.forEach((s) => {
    let patch: Partial<Shape> = {};
    if (s.parentId && !availableIdSet.has(s.parentId)) {
      patch.parentId = undefined;
    }
    if (s.attachment && !availableIdSet.has(s.attachment.id)) {
      patch.attachment = undefined;
    }

    const struct = getStruct(s.type);
    if (struct.refreshRelation) {
      patch = { ...patch, ...struct.refreshRelation(s, availableIdSet) };
    }

    if (!isObjectEmpty(patch)) {
      ret[s.id] = patch;
    }
  });

  return ret;
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

export function canAttachSmartBranch(getStruct: GetShapeStruct, shape: Shape): boolean {
  const struct = getStruct(shape.type);
  return !!struct.canAttachSmartBranch;
}

export function shouldKeepAspect(getStruct: GetShapeStruct, shape: Shape): boolean {
  const struct = getStruct(shape.type);
  return !!struct.shouldKeepAspect;
}

export function stackOrderDisabled(getStruct: GetShapeStruct, shape: Shape): boolean {
  const struct = getStruct(shape.type);
  return !!struct.stackOrderDisabled;
}

export function isRectangularOptimizedSegment(getStruct: GetShapeStruct, shape: Shape): boolean {
  const struct = getStruct(shape.type);
  return !!struct.rectangularOptimizedSegment;
}

/**
 * Make sure both src and dist shapes have compatibility before calling this function.
 */
export function switchShapeType(getStruct: GetShapeStruct, src: Shape, type: string): Shape {
  const defaultDist = createShape(getStruct, type, { id: src.id });
  const defaultDistRect = getWrapperRect(getStruct, defaultDist);
  const srcRect = getWrapperRect(getStruct, { ...src, rotation: 0 });

  const resizePatch = resizeShape(getStruct, defaultDist, [
    srcRect.width / defaultDistRect.width,
    0,
    0,
    srcRect.height / defaultDistRect.height,
    srcRect.x,
    srcRect.y,
  ]);

  const fill = hasFillStyle(src) ? { fill: src.fill } : {};
  const stroke = hasStrokeStyle(src) ? { stroke: src.stroke } : {};

  const basicProperties: Partial<Shape> = createBaseShape(src);
  delete basicProperties.type;

  return { ...defaultDist, ...basicProperties, ...resizePatch, ...fill, ...stroke };
}

export function getAttachmentByUpdatingRotation(shape: Shape, rotation?: number): ShapeAttachment | undefined {
  if (rotation === undefined || !shape.attachment) return;
  const v = rotation - shape.rotation;
  if (v === 0) return;
  return { ...shape.attachment, rotation: geometry.normalizeRadian(shape.attachment.rotation + v) };
}

export function getOrderPriority(getStruct: GetShapeStruct, shape: Shape): number {
  const struct = getStruct(shape.type);
  return struct.orderPriority ?? 0;
}

export function hasSpecialOrderPriority(getStruct: GetShapeStruct, shape: Shape): boolean {
  return getOrderPriority(getStruct, shape) !== 0;
}

/**
 * This function doesn't check if the shape already has the parent.
 * => Because it's impossible to check if the parent really exists without all shapes.
 */
export function canShapeGrouped(getStruct: GetShapeStruct, shape: Shape): boolean {
  return !hasSpecialOrderPriority(getStruct, shape);
}
