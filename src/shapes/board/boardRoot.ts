import { Shape } from "../../models";
import { ShapeStruct, createBaseShape } from "../core";
import { struct as groupStruct } from "../group";

export type BoardRootShape = Shape;

export const struct: ShapeStruct<BoardRootShape> = {
  ...groupStruct,
  label: "BoardRoot",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "board_root",
    };
  },
  canAttachSmartBranch: false,
  transparentSelection: true,
};

export function isBoardRootShape(shape: Shape): shape is BoardRootShape {
  return shape.type === "board_root";
}
