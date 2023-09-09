import { AffineMatrix, IRectangle, IVec2 } from "okageo";
import { CommonStyle, FillStyle, Shape, StrokeStyle } from "../models";
import { isSameFillStyle } from "../utils/fillStyle";
import { isSameStrokeStyle } from "../utils/strokeStyle";

export interface ShapeStruct<T extends Shape> {
  label: string;
  create: (arg?: Partial<T>) => T;
  render: (ctx: CanvasRenderingContext2D, shape: T) => void;
  getWrapperRect: (shape: T) => IRectangle;
  getLocalRectPolygon: (shape: T) => IVec2[];
  getTextRangeRect?: (shape: T) => IRectangle | undefined;
  isPointOn: (shape: T, p: IVec2) => boolean;
  resize: (shape: T, resizingAffine: AffineMatrix) => Partial<T>;
  getSnappingLines?: (shape: T) => ShapeSnappingLines;
  getClosestOutline?: (shape: T, p: IVec2, threshold: number) => IVec2 | undefined;
  getClosestIntersectedOutline?: (shape: T, from: IVec2, to: IVec2) => IVec2 | undefined;
  getCommonStyle?: (shape: T) => CommonStyle | undefined;
  updateCommonStyle?: (shape: T, val: Partial<T>) => Partial<T>;
  immigrateShapeIds?: (shape: T, oldToNewIdMap: { [newId: string]: string }, removeNotFound?: boolean) => Partial<T>;
}

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
  };
}

export function getCommonStyle<T extends Shape & CommonStyle>(shape: T): CommonStyle {
  return { fill: shape.fill, stroke: shape.stroke };
}

export function updateCommonStyle<T extends Shape & CommonStyle>(
  shape: T,
  val: { fill?: FillStyle; stroke?: StrokeStyle }
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
