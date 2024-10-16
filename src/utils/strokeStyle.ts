import { LineDash, StrokeStyle } from "../models";
import { colorToHex, isSameColor, rednerRGBA } from "./color";
import { SVGAttributes } from "./svgElements";

export function createStrokeStyle(arg: Partial<StrokeStyle> = {}): StrokeStyle {
  return {
    color: { r: 0, g: 0, b: 0, a: 1 },
    ...arg,
  };
}

export function getLineDap(lineDap?: LineDash): LineDash {
  return lineDap ?? "solid";
}

export function getLineCap(lineCap?: CanvasLineCap): CanvasLineCap {
  return lineCap ?? "butt";
}

export function getLineJoin(lineJoin?: CanvasLineJoin): CanvasLineJoin {
  return lineJoin ?? "round";
}

export function isSameStrokeStyle(a?: StrokeStyle, b?: StrokeStyle): boolean {
  return (
    a?.disabled === b?.disabled &&
    isSameColor(a?.color, b?.color) &&
    a?.width === b?.width &&
    a?.dash === b?.dash &&
    getLineCap(a?.lineCap) === getLineCap(b?.lineCap) &&
    getLineJoin(a?.lineJoin) === getLineJoin(b?.lineJoin)
  );
}

export function applyStrokeStyle(ctx: CanvasRenderingContext2D, stroke: StrokeStyle) {
  ctx.strokeStyle = rednerRGBA(stroke.color);
  const width = getStrokeWidth(stroke);
  ctx.lineWidth = width;
  ctx.setLineDash(getLineDashArrayWithCap(stroke.dash, stroke.lineCap, width));
  ctx.lineCap = getLineCap(stroke.lineCap);
  ctx.lineJoin = getLineJoin(stroke.lineJoin);
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

function getLineDashArray(lineDash: LineDash, width = 1): number[] {
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

export function getLineDashArrayWithCap(lineDash: LineDash, lineCap: CanvasLineCap = "butt", width = 1): number[] {
  switch (lineCap) {
    case "butt":
      return getLineDashArray(lineDash, width);
    default: {
      switch (lineDash) {
        case "dot":
          // Stroke part must have nonzero value to keep the direction
          return [0.01, width * 2];
        case "short":
          return [width * 2, width * 2];
        case "long":
          return [width * 5, width * 2];
        default:
          return [];
      }
    }
  }
}

export function renderStrokeSVGAttributes(stroke: StrokeStyle): SVGAttributes {
  return stroke.disabled
    ? { stroke: "none" }
    : {
        stroke: colorToHex(stroke.color),
        "stroke-opacity": stroke.color.a === 1 ? undefined : stroke.color.a,
        "stroke-width": stroke.width,
        "stroke-linecap": getLineCap(stroke.lineCap),
        "stroke-linejoin": getLineJoin(stroke.lineJoin),
        "stroke-dasharray": stroke.dash
          ? getLineDashArrayWithCap(stroke.dash, stroke.lineCap, stroke.width).join(" ")
          : undefined,
      };
}
