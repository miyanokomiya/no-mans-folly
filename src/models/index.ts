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
}

export interface Layer extends Entity {
  name: string;
}

export interface Shape extends Entity {
  layerId?: string;
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
  color: Color;
}

export interface StrokeStyle {
  color: Color;
}
