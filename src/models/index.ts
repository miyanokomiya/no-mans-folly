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

export interface BoxAlign {
  hAlign?: "left" | "center" | "right"; // "left" should be default
  vAlign?: "top" | "center" | "bottom"; // "top" should be default
}

export interface BoxPadding {
  type?: "relative"; // undefined should mean "absolute"
  value: [top: number, right: number, bottom: number, left: number]; // represents px with absolute, rate with relative
}

export type Direction4 = 0 | 1 | 2 | 3; // top, right, bottom, left
