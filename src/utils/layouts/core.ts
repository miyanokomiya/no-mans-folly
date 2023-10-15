import { IRectangle } from "okageo";
import { Entity } from "../../models";

export interface LayoutNode extends Entity {
  rect: IRectangle;
}

export type LayoutFn<T extends LayoutNode> = (src: T[]) => T[];
