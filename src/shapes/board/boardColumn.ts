import { Shape } from "../../models";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { RectangleShape, struct as rectangleStruct } from "../rectangle";

const COLUMN_WIDTH = 340;

export type BoardColumnShape = RectangleShape;

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
    };
  },
  getTextRangeRect(shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: 20 };
    return rect;
  },
  canAttachSmartBranch: false,
};

export function isBoardColumnShape(shape: Shape): shape is BoardColumnShape {
  return shape.type === "board_column";
}
