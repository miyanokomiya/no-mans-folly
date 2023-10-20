import { Shape } from "../../models";
import { createColor } from "../../models/factories";
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
      fill: arg.fill ?? createFillStyle({ color: createColor(255, 255, 255, 0.3) }),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 300,
      height: arg.height ?? 100,
    };
  },
  getTextRangeRect(shape) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: 20 };
    return rect;
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
