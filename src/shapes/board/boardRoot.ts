import { Shape } from "../../models";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { COLORS } from "../../utils/color";
import { createFillStyle } from "../../utils/fillStyle";
import { applyLocalSpace } from "../../utils/renderer";
import { applyStrokeStyle, createStrokeStyle } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { RectangleShape, struct as rectangleStruct } from "../rectangle";

const TITLE_MIN_HEIGHT = 40;

export type BoardRootShape = RectangleShape & {
  titleHeight: number;
};

export const struct: ShapeStruct<BoardRootShape> = {
  ...rectangleStruct,
  label: "BoardRoot",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "board_root",
      fill: arg.fill ?? createFillStyle({ color: COLORS.WHITE }),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([6, 6, 6, 6]),
      titleHeight: arg.titleHeight ?? TITLE_MIN_HEIGHT,
    };
  },
  render(ctx, shape) {
    rectangleStruct.render(ctx, shape);

    if (!shape.stroke.disabled) {
      applyLocalSpace(
        ctx,
        { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height },
        shape.rotation,
        () => {
          applyStrokeStyle(ctx, shape.stroke);
          ctx.beginPath();
          ctx.moveTo(shape.width * 0.03, shape.titleHeight);
          ctx.lineTo(shape.width * 0.97, shape.titleHeight);
          ctx.stroke();
        },
      );
    }
  },
  resize(shape, resizingAffine) {
    const resized = rectangleStruct.resize(shape, resizingAffine);

    if (resized.height && resized.height !== shape.height) {
      return { ...resized, titleHeight: (shape.titleHeight * resized.height) / shape.height };
    }

    return resized;
  },
  getTextRangeRect(shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.titleHeight };
    return getPaddingRect(shape.textPadding, rect);
  },
  resizeOnTextEdit(shape, textBoxSize) {
    const prect = getPaddingRect(shape.textPadding, { x: 0, y: 0, width: shape.width, height: shape.titleHeight });
    const hDiff = prect ? shape.titleHeight - prect.height : 0;

    let changed = false;
    const ret: Partial<BoardRootShape> = {};

    const nextHeight = textBoxSize.height + hDiff;
    if (shape.titleHeight !== nextHeight) {
      ret.titleHeight = Math.max(nextHeight, TITLE_MIN_HEIGHT);
      changed = true;
    }

    return changed ? ret : undefined;
  },
  canAttachSmartBranch: false,
  transparentSelection: true,
};

export function isBoardRootShape(shape: Shape): shape is BoardRootShape {
  return shape.type === "board_root";
}
