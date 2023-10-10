import { Shape } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import { getRotatedRectAffine } from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { RectangleShape, struct as recntagleStruct } from "./rectangle";
import { mapReduce } from "../utils/commons";

export type EmojiShape = RectangleShape & {
  emoji: string;
};

export const struct: ShapeStruct<EmojiShape> = {
  ...recntagleStruct,
  label: "Emoji",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "emoji",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle({ disabled: true }),
      width: arg.width ?? 50,
      height: arg.height ?? 50,
      emoji: arg.emoji ?? "?",
    };
  },
  render(ctx, shape) {
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

    // Adjust a bit to put emoji at the center.
    // This settings work well on Window + Unicode though, not sure about other environments.
    ctx.font = `${shape.height * 0.9}px Arial`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "center";
    ctx.fillText(shape.emoji, shape.width / 2, shape.height);

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

export function isEmojiShape(shape: Shape): shape is EmojiShape {
  return shape.type === "emoji";
}
