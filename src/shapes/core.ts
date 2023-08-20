import { Shape } from "../models";

export interface ShapeStruct<T extends Shape> {
  label: string;
  create: (arg?: Partial<T>) => T;
  render: (ctx: CanvasRenderingContext2D, shape: T) => void;
}
