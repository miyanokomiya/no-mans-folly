import { BoxAlign, Shape } from "../../models";
import { RectangleShape } from "../rectangle";

export type TreeShapeBase = RectangleShape &
  BoxAlign & {
    maxWidth: number;
  };

export function isTreeShapeBase(shape: Shape): shape is TreeShapeBase {
  return shape.type === "tree_root" || shape.type === "tree_node";
}
