import { CommonStyle } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { RectPolygonShape } from "./rectPolygon";
import { struct as rectangleStruct } from "./rectangle";

export type FrameShape = RectPolygonShape & CommonStyle;

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
};
