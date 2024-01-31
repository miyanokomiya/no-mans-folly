import { Shape } from "../../models";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { getRotatedRectAffine } from "../../utils/geometry";
import { applyLocalSpace } from "../../utils/renderer";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../../utils/strokeStyle";
import { renderTransform } from "../../utils/svgElements";
import { ShapeStruct, createBaseShape } from "../core";
import { RectangleShape, struct as rectangleStruct } from "../rectangle";

const COLUMN_WIDTH = 300;
const TITLE_MIN_HEIGHT = 40;

export type BoardColumnShape = RectangleShape & {
  titleHeight: number;
};

export const struct: ShapeStruct<BoardColumnShape> = {
  ...rectangleStruct,
  label: "BoardColumn",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "board_column",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? COLUMN_WIDTH,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([6, 6, 6, 6]),
      titleHeight: arg.titleHeight ?? TITLE_MIN_HEIGHT,
    };
  },
  render(ctx, shape, shapeContext) {
    rectangleStruct.render(ctx, shape);

    if (!shape.stroke.disabled) {
      const columns = shapeContext
        ? (shapeContext.treeNodeMap[shape.parentId!]?.children ?? [])
            .map((t) => shapeContext.shapeMap[t.id])
            .filter(isBoardColumnShape)
        : [];
      const titleHeight = columns.reduce((m, c) => Math.max(m, c.titleHeight ?? 0), 0);

      applyLocalSpace(
        ctx,
        { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height },
        shape.rotation,
        () => {
          applyStrokeStyle(ctx, shape.stroke);
          ctx.beginPath();
          const [from, to] = getDelimiterLine(shape.width);
          ctx.moveTo(from, titleHeight);
          ctx.lineTo(to, titleHeight);
          ctx.stroke();
        },
      );
    }
  },
  createSVGElementInfo(shape, shapeContext) {
    if (shape.stroke.disabled) return rectangleStruct.createSVGElementInfo?.(shape);

    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const affine = getRotatedRectAffine(rect, shape.rotation);
    const body = rectangleStruct.createSVGElementInfo!({ ...shape, p: { x: 0, y: 0 }, rotation: 0 })!;
    const [from, to] = getDelimiterLine(shape.width);
    const columns = shapeContext
      ? (shapeContext.treeNodeMap[shape.parentId!]?.children ?? [])
          .map((t) => shapeContext.shapeMap[t.id])
          .filter(isBoardColumnShape)
      : [];
    const titleHeight = columns.reduce((m, c) => Math.max(m, c.titleHeight ?? 0), 0);

    return {
      tag: "g",
      attributes: { transform: renderTransform(affine) },
      children: [
        body,
        {
          tag: "line",
          attributes: {
            x1: from,
            y1: titleHeight,
            x2: to,
            y2: titleHeight,
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
    const ret: Partial<BoardColumnShape> = {};

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

export function isBoardColumnShape(shape: Shape): shape is BoardColumnShape {
  return shape.type === "board_column";
}

function getDelimiterLine(width: number): [number, number] {
  return [width * 0.03, width * 0.97];
}
