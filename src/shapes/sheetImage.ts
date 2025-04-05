import { Shape } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { ImageShape, struct as imageStruct } from "./image";

export type SheetImageShape = ImageShape;

export const struct: ShapeStruct<SheetImageShape> = {
  ...imageStruct,
  label: "SheetImage",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "sheet_image",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      assetId: arg.assetId,
    };
  },
  shouldKeepAspect: false,
};

export function isSheetImageShape(shape: Shape): shape is SheetImageShape {
  return shape.type === "sheet_image";
}
