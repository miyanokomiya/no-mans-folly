import { IRectangle, IVec2 } from "okageo";
import { Shape } from "../models";

export interface ShapeStruct<T extends Shape> {
  label: string;
  create: (arg?: Partial<T>) => T;
  render: (ctx: CanvasRenderingContext2D, shape: T) => void;
  getWrapperRect: (shape: T) => IRectangle;
  getLocalRectPolygon: (shape: T) => IVec2[];
  isPointOn: (shape: T, p: IVec2) => boolean;
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
