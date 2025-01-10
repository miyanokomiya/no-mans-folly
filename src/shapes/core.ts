import { AffineMatrix, IRectangle, IVec2 } from "okageo";
import { BoxPadding, CommonStyle, FillStyle, Shape, Size, StrokeStyle } from "../models";
import { isSameFillStyle } from "../utils/fillStyle";
import { isSameStrokeStyle } from "../utils/strokeStyle";
import { TreeNode } from "../utils/tree";
import { ImageStore } from "../composables/imageStore";
import { isSameBoxPadding } from "../utils/boxPadding";
import { SVGElementInfo } from "../utils/svgElements";
import { ISegment } from "../utils/geometry";

export type GetShapeStruct = (type: string) => ShapeStruct<any>;

export type LineJumpMap = Map<string, ISegment[][]>;

export interface ShapeContext {
  shapeMap: { [id: string]: Shape };
  treeNodeMap: { [id: string]: TreeNode };
  getStruct: GetShapeStruct;
  lineJumpMap: LineJumpMap;
}

/**
 * Selection scope strategy
 * - When a scope is undefined, root shapes and children of transparent root shapes are selection candidates.
 * - When a scope is defined
 *   - When parentId is undefined, root shapes are selection candidates.
 *   - When parentId is defined, its children are selection candidates.
 *   - When parentId and scopeKey are defined, its children having the same scopeKey are selection candidates.
 */
export interface ShapeSelectionScope {
  parentId?: string; // When undefined, the scope refers strict root scope ignoring transparency
  scopeKey?: string;
  shapeType?: string;
}

export interface ShapeStruct<T extends Shape> {
  label: string;
  create: (arg?: Partial<T>) => T;
  /**
   * Some shapes can depend on their children for rendering.
   * => e.g. line shape can have child labels and the line should be clipped by them.
   * "shapeMap" and "treeNode" are used for such purpose.
   */
  render: (ctx: CanvasRenderingContext2D, shape: T, shapeContext?: ShapeContext, imageStore?: ImageStore) => void;
  getClipPath?: (shape: T, shapeContext?: ShapeContext) => Path2D;
  createSVGElementInfo?: (shape: T, shapeContext?: ShapeContext, imageStore?: ImageStore) => SVGElementInfo | undefined;
  createClipSVGPath?: (shape: T, shapeContext?: ShapeContext) => string | undefined;
  getWrapperRect: (shape: T, shapeContext?: ShapeContext, includeBounds?: boolean) => IRectangle;
  getLocalRectPolygon: (shape: T, shapeContext?: ShapeContext) => IVec2[];
  getTextRangeRect?: (shape: T) => IRectangle;
  getTextPadding?: (shape: T) => BoxPadding | undefined;
  patchTextPadding?: (shape: T, value: BoxPadding) => Partial<T>;
  /**
   * "scale" should be used to adjust threshold for non-area items: points and lines
   */
  isPointOn: (shape: T, p: IVec2, shapeContext?: ShapeContext, scale?: number) => boolean;
  resize: (shape: T, resizingAffine: AffineMatrix, shapeContext?: ShapeContext) => Partial<T>;
  /**
   * "textBoxSize" refers to the eventual text box size including text padding.
   */
  resizeOnTextEdit?: (shape: T, textBoxSize: Size) => Partial<T> | undefined;
  /**
   * Lines should be sorted top-left to bottom-right in each direction.
   */
  getSnappingLines?: (shape: T) => ShapeSnappingLines;
  getClosestOutline?: (shape: T, p: IVec2, threshold: number, thresholdForMarker?: number) => IVec2 | undefined;
  getTangentAt?: (shape: T, p: IVec2) => number;
  getIntersectedOutlines?: (shape: T, from: IVec2, to: IVec2) => IVec2[] | undefined;
  getCommonStyle?: (shape: T) => CommonStyle | undefined;
  updateCommonStyle?: (shape: T, val: Partial<T>) => Partial<T>;
  /**
   * Needless to care "parentId" that is immigrated outside this function.
   */
  immigrateShapeIds?: (shape: T, oldToNewIdMap: { [newId: string]: string }, removeNotFound?: boolean) => Partial<T>;
  /**
   * Needless to care "parentId" that is refreshed outside this function.
   */
  refreshRelation?: (shape: T, availableIdSet: Set<string>) => Partial<T> | undefined;
  /**
   * Returns true when the shape should be deleted under the condition of the context.
   */
  shouldDelete?: (shape: T, shapeContext: ShapeContext) => boolean;
  /**
   * Returns selection scope for the shape. See the description of ShapeSelectionScope.
   * When this method is undefined, valid "parentId" should be used.
   */
  getSelectionScope?: (shape: T, shapeContext: ShapeContext) => ShapeSelectionScope;
  /**
   * Define when a shape has special position behavior.
   * e.g. group shape doesn't have own position but it's derived from children.
   */
  getActualPosition?: (shape: T, shapeContext: ShapeContext) => IVec2;
  /**
   * Define when a shape has special local rect polygon for layout.
   * e.g. As for tree_root shape, this returns the bounds accommodating all children.
   */
  getRectPolygonForLayout?: (shape: T, shapeContext: ShapeContext) => IVec2[];
  canAttachSmartBranch?: boolean;
  shouldKeepAspect?: boolean;
  /**
   * If true, children of this shape should be selected as if they are in the root scope.
   */
  transparentSelection?: boolean;
  /**
   * If true, this shape's "findex" doesn't change via usual operation.
   * When "findex" has special meaning for this shape, such as tree node shape, type. set this attribute true.
   */
  stackOrderDisabled?: boolean;
  /**
   * If true, child shapes don't follow the shape's scaling.
   */
  unboundChildren?: boolean;
  /**
   * If true, lines that connect to the center of this shape are optimized based on rectangular bounds.
   */
  rectangularOptimizedSegment?: boolean;
  /**
   * The smaller, the ealier shapes's order should be in the list.
   * "undefined" means zero.
   * This only affects root shapes.
   */
  orderPriority?: number;
  /**
   * If true, shapes are movable only when they are already selected.
   */
  rigidMove?: boolean;
}

/**
 * Each direction list must be aligned top-bottom or left-right order.
 * => Interval snapping depends on this order.
 */
export interface ShapeSnappingLines {
  v: [IVec2, IVec2][];
  h: [IVec2, IVec2][];
}

export function createBaseShape(arg: Partial<Shape> = {}): Shape {
  return {
    id: arg.id ?? "",
    findex: arg.findex ?? "",
    type: arg.type ?? "",
    p: arg.p ?? { x: 0, y: 0 },
    rotation: arg.rotation ?? 0,
    parentId: arg.parentId,
    gcV: arg.gcV,
    gcH: arg.gcH,
    locked: arg.locked,
    clipping: arg.clipping,
    cropClipBorder: arg.cropClipBorder,
    alpha: arg.alpha,
    attachment: arg.attachment,
  };
}

export function getCommonStyle<T extends Shape & CommonStyle>(shape: T): CommonStyle {
  return { fill: shape.fill, stroke: shape.stroke };
}

export function updateCommonStyle<T extends Shape & CommonStyle>(
  shape: T,
  val: { fill?: FillStyle; stroke?: StrokeStyle },
): Partial<T> {
  const ret: Partial<T> = {};
  if (val.fill && !isSameFillStyle(shape.fill, val.fill)) {
    ret.fill = val.fill;
  }
  if (val.stroke && !isSameStrokeStyle(shape.stroke, val.stroke)) {
    ret.stroke = val.stroke;
  }
  return ret;
}

export interface TextContainer {
  textPadding?: BoxPadding;
  maxWidth?: number;
}

export const textContainerModule = {
  getTextPadding<T extends TextContainer>(shape: T): BoxPadding | undefined {
    return shape.textPadding;
  },
  patchTextPadding<T extends TextContainer>(shape: T, value?: BoxPadding): Partial<TextContainer> {
    return isSameBoxPadding(shape.textPadding, value) ? {} : { textPadding: value };
  },
};

export function isSameShapeSelectionScope(a?: ShapeSelectionScope, b?: ShapeSelectionScope): boolean {
  if (a && b) {
    return a.parentId === b.parentId && a.scopeKey === b.scopeKey;
  }
  return a === b;
}

export function isSameShapeParentScope(a?: ShapeSelectionScope, b?: ShapeSelectionScope): boolean {
  if (a && b) {
    return a.parentId === b.parentId;
  }
  return a === b;
}

export function hasFillStyle(shape: Shape): shape is Shape & { fill: FillStyle } {
  return "fill" in shape;
}

export function hasStrokeStyle(shape: Shape): shape is Shape & { stroke: StrokeStyle } {
  return "stroke" in shape;
}

export function isInvisibleClippingShape(shape: Shape): boolean {
  return !!shape.clipping && (!hasStrokeStyle(shape) || !!shape.stroke.disabled);
}

export function canHaveOutlineWithinGroup(shape: Shape): boolean {
  if (!shape.clipping) return true;
  if (shape.cropClipBorder) return false;
  return hasStrokeStyle(shape) && !shape.stroke.disabled;
}
