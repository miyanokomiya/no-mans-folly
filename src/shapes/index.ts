import { AffineMatrix, IRectangle, IVec2, getOuterRectangle, getRectCenter, multiAffines, sub } from "okageo";
import { BoxPadding, CommonStyle, Shape, Size } from "../models";
import {
  GetShapeStruct as _GetShapeStruct,
  ShapeContext,
  ShapeSnappingLines,
  ShapeStruct,
  TextContainer,
} from "./core";
import { struct as rectangleStruct } from "./rectangle";
import { struct as rhombusStruct } from "./rhombus";
import { struct as trapezoidStruct } from "./polygons/trapezoid";
import { struct as cylinderStruct } from "./polygons/cylinder";
import { struct as bubbleStruct } from "./polygons/bubble";
import { struct as oneSidedArrowStruct } from "./oneSidedArrow";
import { struct as twoSidedArrowStruct } from "./twoSidedArrow";
import { struct as textStruct } from "./text";
import { struct as ellipseStruct } from "./ellipse";
import { struct as lineStruct } from "./line";
import { struct as imageStruct } from "./image";
import { struct as emojiStruct } from "./emoji";
import { struct as groupStruct } from "./group";
import { struct as treeRootStruct } from "./tree/treeRoot";
import { struct as treeNodeStruct } from "./tree/treeNode";
import { struct as boardRootStruct } from "./board/boardRoot";
import { struct as boardColumnStruct } from "./board/boardColumn";
import { struct as boardLaneStruct } from "./board/boardLane";
import { struct as boardCardStruct } from "./board/boardCard";
import { struct as alignBoxStruct } from "./align/alignBox";
import * as geometry from "../utils/geometry";
import { generateKeyBetween } from "fractional-indexing";
import { DocOutput } from "../models/document";
import { mapDataToObj, remap } from "../utils/commons";
import { ImageStore } from "../composables/imageStore";
import { newShapeComposite } from "../composables/shapeComposite";
import { getPaddingRect } from "../utils/boxPadding";
import { SVGElementInfo } from "../utils/svgElements";

const SHAPE_STRUCTS: {
  [type: string]: ShapeStruct<any>;
} = {
  rectangle: rectangleStruct,
  rhombus: rhombusStruct,
  trapezoid: trapezoidStruct,
  cylinder: cylinderStruct,
  bubble: bubbleStruct,
  one_sided_arrow: oneSidedArrowStruct,
  two_sided_arrow: twoSidedArrowStruct,
  text: textStruct,
  ellipse: ellipseStruct,
  line: lineStruct,
  image: imageStruct,
  emoji: emojiStruct,
  group: groupStruct,
  tree_root: treeRootStruct,
  tree_node: treeNodeStruct,
  board_root: boardRootStruct,
  board_column: boardColumnStruct,
  board_lane: boardLaneStruct,
  board_card: boardCardStruct,
  align_box: alignBoxStruct,
};

export type GetShapeStruct = _GetShapeStruct;

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
  shapeContext: ShapeContext,
  imageStore?: ImageStore,
) {
  const struct = getStruct(shape.type);
  struct.render(ctx, shape, shapeContext, imageStore);
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
  to: IVec2,
): IVec2[] | undefined {
  const struct = getStruct(shape.type);
  if (struct.getIntersectedOutlines) return struct.getIntersectedOutlines(shape, from, to);
}

export function getLocationRateOnShape(getStruct: GetShapeStruct, shape: Shape, p: IVec2) {
  return geometry.getLocationRateOnRectPath(getLocalRectPolygon(getStruct, shape), shape.rotation, p);
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

export function updateCommonStyle(getStruct: GetShapeStruct, shape: Shape, val: Partial<CommonStyle>): Partial<Shape> {
  const struct = getStruct(shape.type);
  return struct.updateCommonStyle?.(shape, val) ?? {};
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
  availableIdSet: Set<string>,
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

export function duplicateShapes(
  getStruct: GetShapeStruct,
  shapes: Shape[],
  docs: [id: string, doc: DocOutput][],
  generateUuid: () => string,
  lastFIndex: string,
  availableIdSet: Set<string>,
  p?: IVec2,
): { shapes: Shape[]; docMap: { [id: string]: DocOutput } } {
  const remapInfo = remapShapeIds(getStruct, shapes, generateUuid, true);
  const remapDocs = remap(mapDataToObj(docs), remapInfo.newToOldMap);

  const remapComposite = newShapeComposite({
    shapes: remapInfo.shapes,
    getStruct,
  });
  const moved = p
    ? shiftShapesAtTopLeft(
        getStruct,
        remapInfo.shapes.map((s) => [s, remapComposite.getWrapperRect(s)]),
        p,
      )
    : remapInfo.shapes;
  const patch = patchShapesOrderToLast(
    moved.map((s) => s.id),
    lastFIndex,
  );

  let result: Shape[] = moved.map((s) => ({ ...s, ...patch[s.id] }));

  const nextAvailableIdSet = new Set(availableIdSet);
  result.forEach((s) => nextAvailableIdSet.add(s.id));

  const refreshed = refreshShapeRelations(getStruct, result, nextAvailableIdSet);
  result = result.map((s) => ({ ...s, ...(refreshed[s.id] ?? {}) }));

  return {
    shapes: result,
    docMap: remapDocs,
  };
}

function shiftShapesAtTopLeft(getStruct: GetShapeStruct, shapeInfos: [Shape, IRectangle][], targetP: IVec2): Shape[] {
  const rect = geometry.getWrapperRect(shapeInfos.map(([, r]) => r));
  const d = sub(targetP, rect);

  const affine: AffineMatrix = [1, 0, 0, 1, d.x, d.y];
  const moved = shapeInfos.map(([s]) => {
    const patch = resizeShape(getStruct, s, affine);
    return { ...s, ...patch };
  });

  return moved;
}
