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
  gcV?: GroupConstraint;
  gcH?: GroupConstraint;
  locked?: boolean;
  clipping?: boolean; // When this is set true, it's prioritized over all child shapes.
  cropClipBorder?: boolean; // This is prioritized over all child shapes.
}

export type ClipRule = "out" | "in";

export interface Size {
  width: number;
  height: number;
}

export interface StyleScheme {
  selectionPrimary: Color;
  selectionSecondaly: Color;
  selectionLineWidth: number;
  transformAnchor: Color;
  alert: Color;
  locked: Color;
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
  /**
   * inner: based on the inner bounds of the target
   * outer: based on the outer bounds of the target
   *
   * undefined should mean "inner"
   */
  boundsType?: "outer";
  value: BoxValues4; // represents px with absolute, rate with relative
}

export type Direction4 = 0 | 1 | 2 | 3; // top, right, bottom, left
export type Direction2 = 0 | 1; // vertical, horizontal

export interface EntityPatchInfo<T extends Entity> {
  add?: T[];
  update?: { [id: string]: Partial<T> };
  delete?: string[];
}

export interface UserSetting {
  wheelAction?: "zoom" | "pan"; // should be "zoom" when it's undefined
  leftDragAction?: "rect-select" | "pan"; // should be "rect-select" when it's undefined
  grid?: "on" | "off"; // should be "on" when it's undefined
  debug?: "on" | "off"; // should be "off" when it's undefined
  virtualKeyboard?: "modifiers" | "off"; // should be "off" when it's undefined
}

/**
 * 0: No constraint
 * 1: fixed top / left
 * 2: fixed content
 * 3: fixed bottom / right
 * 4: fixed top / left and content
 * 5: fixed top / left and bottom / right
 * 6: fixed content and bottom / right
 */
export type GroupConstraint = 0 | 1 | 2 | 3 | 4 | 5 | 6;
