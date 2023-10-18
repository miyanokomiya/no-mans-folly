import { Shape } from "../../models";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { RectangleShape, struct as rectangleStruct } from "../rectangle";

export type BoardRootShape = RectangleShape;

export const struct: ShapeStruct<BoardRootShape> = {
  ...rectangleStruct,
  label: "BoardRoot",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "board_root",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
    };
  },
  getTextRangeRect(shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: 20 };
    return rect;
  },
  canAttachSmartBranch: false,
  transparentSelection: true,
};

export function isBoardRootShape(shape: Shape): shape is BoardRootShape {
  return shape.type === "board_root";
}
