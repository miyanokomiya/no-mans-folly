import { FillStyle } from "../models";
import { colorToHex, isSameColor, rednerRGBA } from "./color";
import { SVGAttributes } from "./svgElements";

export function createFillStyle(arg: Partial<FillStyle> = {}): FillStyle {
  return {
    color: { r: 255, g: 255, b: 255, a: 1 },
    ...arg,
  };
}

export function isSameFillStyle(a?: FillStyle, b?: FillStyle): boolean {
  return a?.disabled === b?.disabled && isSameColor(a?.color, b?.color);
}

export function applyFillStyle(ctx: CanvasRenderingContext2D, fill: FillStyle) {
  ctx.fillStyle = rednerRGBA(fill.color);
}

export function renderFillSVGAttributes(fill: FillStyle): SVGAttributes {
  return fill.disabled
    ? { fill: "none" }
    : {
        fill: colorToHex(fill.color),
        "fill-opacity": fill.color.a === 1 ? undefined : fill.color.a,
      };
}
