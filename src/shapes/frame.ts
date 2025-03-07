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
  sizePresets: [
    { value: { width: 3840, height: 2160 }, label: "4K" },
    { value: { width: 2560, height: 1440 }, label: "2K" },
    { value: { width: 1920, height: 1080 }, label: "Full HD" },
    { value: { width: 1600, height: 1200 }, label: "4:3" },
    { value: { width: 1600, height: 900 }, label: "16:9" },
    { value: { width: 1280, height: 720 }, label: "HD" },
    { value: { width: 1024, height: 768 }, label: "XGA" },
    { value: { width: 800, height: 600 }, label: "4:3" },
  ],
};

export function isFrameShape(s: Shape): s is FrameShape {
  return s.type === "frame";
}
