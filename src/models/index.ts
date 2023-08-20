import { IVec2 } from "okageo";

export interface Entity {
  id: string;
  findex: string;
}

export type Sheet = Entity;

export type Layer = Entity;

export interface Shape extends Entity {
  type: string;
  p: IVec2;
}
