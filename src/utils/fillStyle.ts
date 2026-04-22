import { FillStyle, RGBA } from "../models";
import { colorToHex, isSameColor, rednerRGBA, resolveColor } from "./color";
import { SVGAttributes } from "./svgElements";
import { CanvasCTX } from "./types";

export function createFillStyle(arg: Partial<FillStyle> = {}): FillStyle {
  return {
    color: { r: 255, g: 255, b: 255, a: 1 },
    ...arg,
  };
}

export function isSameFillStyle(a?: FillStyle, b?: FillStyle): boolean {
  return a?.disabled === b?.disabled && isSameColor(a?.color, b?.color);
}

export function applyFillStyle(ctx: CanvasCTX, fill: FillStyle, palette: RGBA[] = []) {
  ctx.fillStyle = rednerRGBA(resolveColor(fill.color, palette));
}

export function renderFillSVGAttributes(fill: FillStyle, palette: RGBA[] = []): SVGAttributes {
  if (fill.disabled) return { fill: "none" };
  const c = resolveColor(fill.color, palette);
  return { fill: colorToHex(c), "fill-opacity": c.a === 1 ? undefined : c.a };
}
