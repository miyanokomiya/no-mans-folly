import { Direction4, Shape } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";
import { TreeRootShape, isTreeRootShape, struct as treeRootStruct } from "./treeRoot";

/**
 * "parentId" should always refer to the root node.
 * "treeParentId" should refer to the parent as the tree structure.
 */
export type TreeNodeShape = TreeRootShape & {
  treeParentId: string;
  direction: Direction4;
};

export const struct: ShapeStruct<TreeNodeShape> = {
  ...treeRootStruct,
  label: "TreeNode",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "tree_node",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 30,
      maxWidth: arg.maxWidth ?? 300,
      treeParentId: arg.treeParentId ?? "",
      direction: arg.direction ?? 1,
    };
  },
  render(ctx, shape, shapeContext) {
    treeRootStruct.render(ctx, shape);

    const treeParent = shapeContext?.shapeMap[shape.treeParentId];
    if (!treeParent || !isTreeRootShape(treeParent)) return;

    const shapeRect = struct.getWrapperRect(shape);
    const treeParentRect = treeRootStruct.getWrapperRect(treeParent);
    applyStrokeStyle(ctx, shape.stroke);
    ctx.beginPath();
    switch (shape.direction) {
      case 3: {
        ctx.moveTo(shapeRect.x + shapeRect.width, shapeRect.y + shapeRect.height / 2);
        ctx.lineTo(treeParentRect.x, treeParentRect.y + treeParentRect.height / 2);
        break;
      }
      default: {
        ctx.moveTo(shapeRect.x, shapeRect.y + shapeRect.height / 2);
        ctx.lineTo(treeParentRect.x + treeParentRect.width, treeParentRect.y + treeParentRect.height / 2);
        break;
      }
    }
    ctx.stroke();
  },
};

export function isTreeNodeShape(shape: Shape): shape is TreeNodeShape {
  return shape.type === "tree_node";
}
