import { Shape } from "../models";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import { getRotatedRectAffine } from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";
import { mapReduce } from "../utils/commons";
import { renderTransform } from "../utils/svgElements";

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
    if (img && img.width * img.height > 0 && shape.width * shape.height > 0) {
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
  createSVGElementInfo(shape, _shapeContext, imageStore) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const affine = getRotatedRectAffine(rect, shape.rotation);

    const imageData = shape.assetId ? imageStore?.getImageData(shape.assetId) : undefined;
    const imgElm = imageData
      ? {
          tag: "use",
          attributes: {
            href: `#${shape.assetId}`,
            // Apply transfrom instead of "width" and "height" that don't work with "<use>" element.
            transform: renderTransform([
              shape.width / imageData.img.width,
              0,
              0,
              shape.height / imageData.img.height,
              0,
              0,
            ]),
          },
        }
      : undefined;

    return {
      tag: "g",
      attributes: {
        transform: renderTransform(affine),
      },
      children: [
        ...(shape.fill.disabled
          ? []
          : [
              {
                tag: "rect",
                attributes: {
                  width: shape.width,
                  height: shape.height,
                  stroke: "none",
                  ...renderFillSVGAttributes(shape.fill),
                },
              },
            ]),
        ...(imgElm ? [imgElm] : []),
        ...(shape.stroke.disabled
          ? []
          : [
              {
                tag: "rect",
                attributes: {
                  width: shape.width,
                  height: shape.height,
                  fill: "none",
                  ...renderStrokeSVGAttributes(shape.stroke),
                },
              },
            ]),
      ],
    };
  },
  getTextRangeRect: undefined,
  ...mapReduce(textContainerModule, () => undefined),
  canAttachSmartBranch: false,
  shouldKeepAspect: true,
};

export function isImageShape(shape: Shape): shape is ImageShape {
  return shape.type === "image";
}
