import { StrokeStyle } from "../models";
import { isSameColor, rednerRGBA } from "./color";

export function createStrokeStyle(arg: Partial<StrokeStyle> = {}): StrokeStyle {
  return {
    color: { r: 0, g: 0, b: 0, a: 1 },
    ...arg,
  };
}

export function isSameStrokeStyle(a?: StrokeStyle, b?: StrokeStyle): boolean {
  return a?.disabled === b?.disabled && isSameColor(a?.color, b?.color) && a?.width === b?.width;
}

export function applyStrokeStyle(ctx: CanvasRenderingContext2D, stroke: StrokeStyle) {
  ctx.strokeStyle = rednerRGBA(stroke.color);
  ctx.lineWidth = stroke.width ?? 1;
  ctx.setLineDash([]);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}
