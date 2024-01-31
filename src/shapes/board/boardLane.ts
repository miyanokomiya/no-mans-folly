import { Shape } from "../../models";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { COLORS } from "../../utils/color";
import { createFillStyle } from "../../utils/fillStyle";
import { getRotatedRectAffine } from "../../utils/geometry";
import { applyLocalSpace } from "../../utils/renderer";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../../utils/strokeStyle";
import { renderTransform } from "../../utils/svgElements";
import { ShapeStruct, createBaseShape } from "../core";
import { RectangleShape, struct as rectangleStruct } from "../rectangle";

const TITLE_MIN_HEIGHT = 40;

export type BoardLaneShape = RectangleShape & {
  titleHeight: number;
};

export const struct: ShapeStruct<BoardLaneShape> = {
  ...rectangleStruct,
  label: "BoardLane",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "board_lane",
      fill: arg.fill ?? createFillStyle({ color: COLORS.WHITE }),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 300,
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
          const [from, to] = getDelimiterLine(shape.width);
          ctx.moveTo(from, shape.titleHeight);
          ctx.lineTo(to, shape.titleHeight);
          ctx.stroke();
        },
      );
    }
  },
  createSVGElementInfo(shape) {
    if (shape.stroke.disabled) return rectangleStruct.createSVGElementInfo?.(shape);

    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const affine = getRotatedRectAffine(rect, shape.rotation);
    const body = rectangleStruct.createSVGElementInfo!({ ...shape, p: { x: 0, y: 0 }, rotation: 0 })!;
    const [from, to] = getDelimiterLine(shape.width);

    return {
      tag: "g",
      attributes: { transform: renderTransform(affine) },
      children: [
        body,
        {
          tag: "line",
          attributes: {
            x1: from,
            y1: shape.titleHeight,
            x2: to,
            y2: shape.titleHeight,
            ...renderStrokeSVGAttributes(shape.stroke),
          },
        },
      ],
    };
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
    const ret: Partial<BoardLaneShape> = {};

    const nextHeight = textBoxSize.height + hDiff;
    if (shape.titleHeight !== nextHeight) {
      ret.titleHeight = Math.max(nextHeight, TITLE_MIN_HEIGHT);
      changed = true;
    }

    return changed ? ret : undefined;
  },
  immigrateShapeIds(shape, oldToNewIdMap, removeNotFound) {
    if (removeNotFound && !oldToNewIdMap[shape.parentId!]) {
      return { type: "rectangle", parentId: undefined };
    }
    return {};
  },
  refreshRelation(shape, availableIdSet) {
    if (!availableIdSet.has(shape.parentId!)) {
      return { type: "rectangle", parentId: undefined };
    }
  },
  getSelectionScope(shape, shapeContext) {
    if (shapeContext.shapeMap[shape.parentId ?? ""]) {
      return { parentId: shape.parentId, scopeKey: shape.type };
    } else {
      return {};
    }
  },
  canAttachSmartBranch: false,
  stackOrderDisabled: true,
};

export function isBoardLaneShape(shape: Shape): shape is BoardLaneShape {
  return shape.type === "board_lane";
}

function getDelimiterLine(width: number): [number, number] {
  return [width * 0.03, width * 0.97];
}
