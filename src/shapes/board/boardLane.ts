import { Shape } from "../../models";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { RectangleShape, struct as rectangleStruct } from "../rectangle";

export type BoardLaneShape = RectangleShape;

export const struct: ShapeStruct<BoardLaneShape> = {
  ...rectangleStruct,
  label: "BoardLane",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "board_lane",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 300,
      height: arg.height ?? 100,
    };
  },
  getTextRangeRect(shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: 20 };
    return rect;
  },
  canAttachSmartBranch: false,
};

export function isBoardLaneShape(shape: Shape): shape is BoardLaneShape {
  return shape.type === "board_lane";
}
