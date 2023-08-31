import { FillStyle } from "../models";
import { isSameColor, rednerRGBA } from "./color";

export function createFillStyle(arg: Partial<FillStyle> = {}): FillStyle {
  return {
    color: { r: 255, g: 255, b: 255, a: 1 },
    ...arg,
  };
}

export function isSameFillStyle(a?: FillStyle, b?: FillStyle): boolean {
  return isSameColor(a?.color, b?.color)
}

export function applyFillStyle(ctx: CanvasRenderingContext2D, fill: FillStyle) {
  ctx.fillStyle = rednerRGBA(fill.color);
}
