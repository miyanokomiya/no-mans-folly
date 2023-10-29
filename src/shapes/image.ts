import { Shape } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import { getRotatedRectAffine } from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";
import { mapReduce } from "../utils/commons";

export type ImageShape = RectangleShape & {
  assetId?: string;
};

export const struct: ShapeStruct<ImageShape> = {
  ...recntagleStruct,
  label: "Image",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "image",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle({ disabled: true }),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      assetId: arg.assetId,
    };
  },
  render(ctx, shape, _shapeContext, imageStore) {
    const affine = getRotatedRectAffine(
      { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height },
      shape.rotation,
    );

    ctx.save();
    ctx.transform(...affine);

    ctx.beginPath();
    if (!shape.fill.disabled) {
      applyFillStyle(ctx, shape.fill);
      ctx.fillRect(0, 0, shape.width, shape.height);
    }

    const img = imageStore?.getImage(shape.assetId ?? "");
    if (img) {
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, shape.width, shape.height);
    } else {
      ctx.fillStyle = "#aaa";
      ctx.fillRect(0, 0, shape.width, shape.height);
    }

    if (!shape.stroke.disabled) {
      applyStrokeStyle(ctx, shape.stroke);
      ctx.strokeRect(0, 0, shape.width, shape.height);
    }

    ctx.restore();
  },
  getTextRangeRect: undefined,
  ...mapReduce(textContainerModule, () => undefined),
  canAttachSmartBranch: false,
  shouldKeepAspect: true,
};

export function isImageShape(shape: Shape): shape is ImageShape {
  return shape.type === "image";
}
