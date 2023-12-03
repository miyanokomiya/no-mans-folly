import { IVec2 } from "okageo";

export interface Entity {
  id: string;
  findex: string;
}

export interface Diagram extends Entity {
  name: string;
}

export interface Sheet extends Entity {
  name: string;
  bgcolor?: Color;
}

export interface Layer extends Entity {
  name: string;
}

export interface Shape extends Entity {
  layerId?: string;
  parentId?: string;
  type: string;
  p: IVec2; // should always represent the top left position
  rotation: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface StyleScheme {
  selectionPrimary: Color;
  selectionSecondaly: Color;
  selectionLineWidth: number;
  alert: Color;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FillStyle {
  disabled?: boolean;
  color: Color;
}

export interface StrokeStyle {
  disabled?: boolean;
  color: Color;
  width?: number;
  dash?: LineDash;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
}

export type LineDash = undefined | "solid" | "dot" | "short" | "long"; // "undefined" refers to "solid"

export interface CommonStyle {
  fill: FillStyle;
  stroke: StrokeStyle;
}

export interface ConnectionPoint {
  id: string;
  rate: IVec2; // relative position in the target rectangle
  optimized?: boolean;
}

export interface LineHead {
  type: string;
}

export type CurveControl = BezierCurveControl | ArcCurveControl;

export interface BezierCurveControl {
  c1: IVec2;
  c2: IVec2;
}

export interface ArcCurveControl {
  // Represents normalized position for target segment.
  // Ref: geometry.ts#normalizeSegment
  d: IVec2;
}

export interface BoxAlign {
  hAlign?: "left" | "center" | "right"; // "left" should be default
  vAlign?: "top" | "center" | "bottom"; // "top" should be default
}

export type BoxValues4 = [top: number, right: number, bottom: number, left: number];

export interface BoxPadding {
  type?: "relative"; // undefined should mean "absolute"
  value: BoxValues4; // represents px with absolute, rate with relative
}

export type Direction4 = 0 | 1 | 2 | 3; // top, right, bottom, left
export type Direction2 = 0 | 1; // vertical, horizontal

export interface EntityPatchInfo<T extends Entity> {
  add?: T[];
  update?: { [id: string]: Partial<T> };
  delete?: string[];
}
