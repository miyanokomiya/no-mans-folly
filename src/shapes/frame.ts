import { CommonStyle, Shape } from "../models";
import { COLORS } from "../utils/color";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import { applyDefaultTextStyle } from "../utils/renderer";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { RectPolygonShape } from "./rectPolygon";
import { struct as rectangleStruct } from "./rectangle";

export type FrameShape = RectPolygonShape & CommonStyle & { name: string };

export const struct: ShapeStruct<FrameShape> = {
  ...rectangleStruct,
  label: "Frame",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "frame",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 300,
      height: arg.height ?? 300,
      name: arg.name ?? "new frame",
    };
  },
  render(ctx, shape) {
    rectangleStruct.render(ctx, shape);
    applyDefaultTextStyle(ctx, 18);
    ctx.textBaseline = "bottom";
    applyStrokeStyle(ctx, { color: COLORS.WHITE });
    ctx.strokeText(shape.name, shape.p.x, shape.p.y - 2);
    applyFillStyle(ctx, { color: COLORS.BLACK });
    ctx.fillText(shape.name, shape.p.x, shape.p.y - 2);
  },
  resize(shape, resizingAffine) {
    const ret = rectangleStruct.resize(shape, resizingAffine);
    if (ret.rotation !== undefined) {
      delete ret.rotation;
    }
    return ret;
  },
  getClipPath: undefined,
  createClipSVGPath: undefined,
  canAttachSmartBranch: false,
  rectangularOptimizedSegment: false,
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

export function isFrameShape(s: Shape): s is FrameShape {
  return s.type === "frame";
}
