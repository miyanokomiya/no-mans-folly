import { IVec2, add } from "okageo";
import { BoxAlign, Direction4, Shape } from "../../models";
import { createFillStyle } from "../../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { struct as treeRootStruct } from "./treeRoot";
import { TreeShapeBase, isTreeShapeBase } from "./core";
import { createBoxPadding } from "../../utils/boxPadding";

/**
 * "parentId" should always refer to the root node.
 * "treeParentId" should refer to the parent as the tree structure.
 */
export type TreeNodeShape = TreeShapeBase & {
  treeParentId: string;
  direction: Direction4;
};

export const struct: ShapeStruct<TreeNodeShape> = {
  ...treeRootStruct,
  label: "TreeNode",
  create(arg = {}) {
    const direction = arg.direction ?? 1;
    return {
      ...createBaseShape(arg),
      type: "tree_node",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 30,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      maxWidth: arg.maxWidth ?? 300,
      treeParentId: arg.treeParentId ?? "",
      direction,
      ...getBoxAlignByDirection(direction),
    };
  },
  render(ctx, shape, shapeContext) {
    treeRootStruct.render(ctx, shape);

    const treeParent = shapeContext?.shapeMap[shape.treeParentId];
    if (!treeParent || !isTreeShapeBase(treeParent)) return;

    const toP = getParentConnectionPoint(treeParent, shape.direction);
    const fromP = getChildConnectionPoint(shape);
    applyStrokeStyle(ctx, shape.stroke);
    ctx.beginPath();
    ctx.moveTo(fromP.x, fromP.y);
    ctx.lineTo(toP.x, toP.y);
    ctx.stroke();
  },
  immigrateShapeIds(shape, oldToNewIdMap) {
    const ret: Partial<TreeNodeShape> = {};

    ret.treeParentId = oldToNewIdMap[shape.treeParentId];

    // When a parent doesn't exist, convert to a rectangle shape.
    if (!ret.treeParentId) {
      ret.type = "rectangle";
      ret.maxWidth = undefined;
      ret.direction = undefined;
      ret.vAlign = undefined;
      ret.hAlign = undefined;
      ret.treeParentId = undefined;
    }

    return ret;
  },
  stackOrderDisabled: true,
};

export function isTreeNodeShape(shape: Shape): shape is TreeNodeShape {
  return shape.type === "tree_node";
}

function getParentConnectionPoint(parent: TreeShapeBase, direction: Direction4): IVec2 {
  switch (direction) {
    case 0:
      return add(parent.p, { x: parent.width / 2, y: 0 });
    case 2:
      return add(parent.p, { x: parent.width / 2, y: parent.height });
    case 3:
      return add(parent.p, { x: 0, y: parent.height / 2 });
    default:
      return add(parent.p, { x: parent.width, y: parent.height / 2 });
  }
}

function getChildConnectionPoint(child: TreeNodeShape): IVec2 {
  switch (child.direction) {
    case 0:
      return add(child.p, { x: child.width / 2, y: child.height });
    case 2:
      return add(child.p, { x: child.width / 2, y: 0 });
    case 3:
      return add(child.p, { x: child.width, y: child.height / 2 });
    default:
      return add(child.p, { x: 0, y: child.height / 2 });
  }
}

export function getBoxAlignByDirection(direction: Direction4): BoxAlign {
  return {
    vAlign: direction === 0 ? "bottom" : direction === 2 ? "top" : "center",
    hAlign: direction === 1 ? "left" : direction === 3 ? "right" : "center",
  };
}
