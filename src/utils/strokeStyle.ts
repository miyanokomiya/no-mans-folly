import { LineDash, LineDashStruct, StrokeStyle } from "../models";
import { colorToHex, isSameColor, rednerRGBA } from "./color";
import { SVGAttributes } from "./svgElements";

export function createStrokeStyle(arg: Partial<StrokeStyle> = {}): StrokeStyle {
  return {
    color: { r: 0, g: 0, b: 0, a: 1 },
    ...arg,
  };
}

export function getLineDash(lineDash?: LineDash): LineDash {
  return lineDash ?? "solid";
}

export function getLineCap(lineCap?: CanvasLineCap): CanvasLineCap {
  return lineCap ?? "butt";
}

export function getLineJoin(lineJoin?: CanvasLineJoin): CanvasLineJoin {
  return lineJoin ?? "round";
}

export function isSameStrokeDashStyle(
  a?: Pick<StrokeStyle, "dash" | "dashCustom">,
  b?: Pick<StrokeStyle, "dash" | "dashCustom">,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.dash !== b.dash) return false;
  if (a.dash !== "custom") return true;

  if (a.dashCustom?.valueType !== b.dashCustom?.valueType) return false;
  if (a.dashCustom?.offset !== b.dashCustom?.offset) return false;
  if (a.dashCustom?.dash.join(",") !== b.dashCustom?.dash.join(",")) return false;
  return true;
}

export function isSameStrokeStyle(a?: StrokeStyle, b?: StrokeStyle): boolean {
  return (
    a?.disabled === b?.disabled &&
    isSameColor(a?.color, b?.color) &&
    a?.width === b?.width &&
    isSameStrokeDashStyle(a, b) &&
    getLineCap(a?.lineCap) === getLineCap(b?.lineCap) &&
    getLineJoin(a?.lineJoin) === getLineJoin(b?.lineJoin)
  );
}

export function applyStrokeStyle(ctx: CanvasRenderingContext2D, stroke: StrokeStyle) {
  ctx.strokeStyle = rednerRGBA(stroke.color);
  const width = getStrokeWidth(stroke);
  ctx.lineWidth = width;
  ctx.setLineDash(getLineDashArrayWithCap(stroke));
  ctx.lineCap = getLineCap(stroke.lineCap);
  ctx.lineJoin = getLineJoin(stroke.lineJoin);
}

export function getStrokeWidth(stroke: Pick<StrokeStyle, "width" | "disabled">): number {
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

function getLineDashArray(stroke: Pick<StrokeStyle, "width" | "lineCap" | "dash" | "dashCustom">): number[] {
  const width = stroke.width ?? 1;
  switch (stroke.dash) {
    case "dot":
      return [width, width];
    case "short":
      return [width * 3, width];
    case "long":
      return [width * 6, width];
    case "custom":
      if (stroke.dashCustom) {
        return getLineDashCustomArray(stroke.dashCustom, width);
      }
      return [];
    default:
      return [];
  }
}

function getLineDashCustomArray(dashStruct: LineDashStruct, width: number): number[] {
  return dashStruct.valueType === "raw" ? dashStruct.dash : dashStruct.dash.map((v) => v * width);
}

export function getLineDashArrayWithCap(stroke: Pick<StrokeStyle, "width" | "lineCap" | "dash">): number[] {
  if (stroke.dash === "custom") return getLineDashArray(stroke);

  const width = stroke.width ?? 1;
  switch (stroke.lineCap) {
    case "butt":
      return getLineDashArray(stroke);
    default: {
      switch (stroke.dash) {
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
        "stroke-dasharray": stroke.dash ? getLineDashArrayWithCap(stroke).join(" ") : undefined,
      };
}
