import { Shape } from "../../models";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { RectangleShape, struct as rectangleStruct } from "../rectangle";

const CARD_WIDTH = 300;
const MIN_HEIGHT = 60;

export type BoardCardShape = RectangleShape & {
  columnId: string;
  laneId: string;
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
      textPadding: arg.textPadding ?? createBoxPadding([6, 6, 6, 6]),
      columnId: arg.columnId ?? "",
      laneId: arg.laneId ?? "",
    };
  },
  resizeOnTextEdit(shape, textBoxSize) {
    const prect = shape.textPadding
      ? getPaddingRect(shape.textPadding, { x: 0, y: 0, width: shape.width, height: shape.height })
      : undefined;
    const hDiff = prect ? shape.height - prect.height : 0;

    let changed = false;
    const ret: Partial<BoardCardShape> = {};

    const nextHeight = textBoxSize.height + hDiff;
    if (shape.height !== nextHeight) {
      ret.height = Math.max(nextHeight, MIN_HEIGHT);
      changed = true;
    }

    return changed ? ret : undefined;
  },
  canAttachSmartBranch: false,
  stackOrderDisabled: true,
};

export function isBoardCardShape(shape: Shape): shape is BoardCardShape {
  return shape.type === "board_card";
}
