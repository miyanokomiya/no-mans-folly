import { CommonStyle, Shape } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
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
      width: arg.width ?? 800,
      height: arg.height ?? 450,
      name: arg.name ?? "new frame",
    };
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
  orderPriority: -10,
  rigidMove: true,
  noRotation: true,
};

export function isFrameShape(s: Shape): s is FrameShape {
  return s.type === "frame";
}
