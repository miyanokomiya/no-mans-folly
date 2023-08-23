import { FillStyle } from "../models";
import { rednerRGBA } from "./color";

export function createFillStyle(arg: Partial<FillStyle> = {}): FillStyle {
  return {
    color: { r: 255, g: 255, b: 255, a: 1 },
    ...arg,
  };
}

export function applyFillStyle(ctx: CanvasRenderingContext2D, fill: FillStyle) {
  ctx.fillStyle = rednerRGBA(fill.color);
}
