import { LineDash, StrokeStyle } from "../models";
import { isSameColor, rednerRGBA } from "./color";

export function createStrokeStyle(arg: Partial<StrokeStyle> = {}): StrokeStyle {
  return {
    color: { r: 0, g: 0, b: 0, a: 1 },
    ...arg,
  };
}

export function isSameStrokeStyle(a?: StrokeStyle, b?: StrokeStyle): boolean {
  return a?.disabled === b?.disabled && isSameColor(a?.color, b?.color) && a?.width === b?.width && a?.dash === b?.dash;
}

export function applyStrokeStyle(ctx: CanvasRenderingContext2D, stroke: StrokeStyle) {
  ctx.strokeStyle = rednerRGBA(stroke.color);
  const width = getStrokeWidth(stroke);
  ctx.lineWidth = width;
  ctx.setLineDash(getLineDashArray(stroke.dash, width));
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

export function getStrokeWidth(stroke: StrokeStyle): number {
  if (stroke.disabled) return 0;
  return stroke.width ?? 1;
}

export function applyDefaultStrokeStyle(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

export function getLineDashArray(lineDash: LineDash, width = 1): number[] {
  switch (lineDash) {
    case "dot":
      return [width, width];
    case "short":
      return [width * 3, width];
    case "long":
      return [width * 6, width];
    default:
      return [];
  }
}
