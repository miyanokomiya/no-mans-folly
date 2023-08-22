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
  p: IVec2;
}
