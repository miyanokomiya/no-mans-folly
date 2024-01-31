import { Shape } from "../../models";
import { createBoxPadding, getBoxPaddingValue, getPaddingRect } from "../../utils/boxPadding";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../../utils/fillStyle";
import { getRotatedRectAffine } from "../../utils/geometry";
import { applyLocalSpace } from "../../utils/renderer";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { renderTransform } from "../../utils/svgElements";
import { ShapeStruct, createBaseShape } from "../core";
import { RectangleShape, struct as rectangleStruct } from "../rectangle";
import { isBoardRootShape } from "./boardRoot";

const CARD_WIDTH = 300;
const MIN_HEIGHT = 60;

export type BoardCardShape = RectangleShape & {
  columnId: string;
  laneId: string; // Empty string represents no lane.
};

export const struct: ShapeStruct<BoardCardShape> = {
  ...rectangleStruct,
  label: "BoardCard",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "board_card",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? CARD_WIDTH,
      height: arg.height ?? MIN_HEIGHT,
      textPadding: arg.textPadding ?? createBoxPadding([6, 6, 12, 6]),
      columnId: arg.columnId ?? "",
      laneId: arg.laneId ?? "",
    };
  },
  render(ctx, shape) {
    rectangleStruct.render(ctx, shape);

    if (!shape.stroke.disabled) {
      const paddingBottom = getBoxPaddingValue(shape.textPadding, {
        x: 0,
        y: 0,
        width: shape.width,
        height: shape.height,
      })[2];
      const y = shape.height - paddingBottom / 2;

      applyLocalSpace(
        ctx,
        { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height },
        shape.rotation,
        () => {
          applyFillStyle(ctx, { color: shape.stroke.color });
          ctx.beginPath();
          ctx.fillRect(0, y, shape.width, paddingBottom / 2);
          ctx.stroke();
        },
      );
    }
  },
  createSVGElementInfo(shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    const affine = getRotatedRectAffine(rect, shape.rotation);
    const body = rectangleStruct.createSVGElementInfo!({ ...shape, p: { x: 0, y: 0 }, rotation: 0 })!;
    const paddingBottom = getBoxPaddingValue(shape.textPadding, {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
    })[2];
    const y = shape.height - paddingBottom / 2;

    return {
      tag: "g",
      attributes: { transform: renderTransform(affine) },
      children: [
        body,
        {
          tag: "rect",
          attributes: {
            y,
            width: shape.width,
            height: paddingBottom / 2,
            stroke: "none",
            ...renderFillSVGAttributes(shape.stroke),
          },
        },
      ],
    };
  },
  resizeOnTextEdit(shape, textBoxSize) {
    const prect = getPaddingRect(shape.textPadding, { x: 0, y: 0, width: shape.width, height: shape.height });
    const hDiff = shape.height - prect.height;

    let changed = false;
    const ret: Partial<BoardCardShape> = {};

    const nextHeight = textBoxSize.height + hDiff;
    if (shape.height !== nextHeight) {
      ret.height = Math.max(nextHeight, MIN_HEIGHT);
      changed = true;
    }

    return changed ? ret : undefined;
  },
  immigrateShapeIds(shape, oldToNewIdMap, removeNotFound) {
    if (removeNotFound && !oldToNewIdMap[shape.columnId]) {
      return { parentId: undefined, columnId: "", laneId: "" };
    }

    const ret: Partial<BoardCardShape> = { columnId: oldToNewIdMap[shape.columnId] };
    if (shape.laneId) {
      if (oldToNewIdMap[shape.laneId]) {
        ret.laneId = oldToNewIdMap[shape.laneId];
      } else if (removeNotFound) {
        ret.laneId = undefined;
      }
    }

    return ret;
  },
  refreshRelation(shape, availableIdSet) {
    if (!availableIdSet.has(shape.columnId)) {
      return { columnId: "", laneId: "" };
    } else if (shape.laneId && !availableIdSet.has(shape.laneId)) {
      return { laneId: "" };
    }
  },
  shouldDelete(shape, shapeContext) {
    // Should delete this card when its board exists but its column doesn't.
    if (!shape.parentId || !shapeContext.shapeMap[shape.parentId]) return false;
    return !shapeContext.shapeMap[shape.columnId];
  },
  getSelectionScope(shape, shapeContext) {
    const parent = shapeContext.shapeMap[shape.parentId ?? ""];
    if (!parent) return {};

    if (isBoardRootShape(parent) && shapeContext.shapeMap[shape.columnId]) {
      return { parentId: parent.id, scopeKey: shape.type };
    } else {
      return { parentId: parent.id };
    }
  },
  canAttachSmartBranch: false,
  stackOrderDisabled: true,
};

export function isBoardCardShape(shape: Shape): shape is BoardCardShape {
  return shape.type === "board_card";
}
