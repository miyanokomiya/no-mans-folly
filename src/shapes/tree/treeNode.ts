import { IVec2, add } from "okageo";
import { BoxAlign, Direction4, Shape } from "../../models";
import { createFillStyle } from "../../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { TreeRootShape, isTreeRootShape, struct as treeRootStruct } from "./treeRoot";
import { TreeShapeBase, isTreeShapeBase } from "./core";
import { createBoxPadding } from "../../utils/boxPadding";

const MIN_WIDTH = 120;
const MIN_HEIGHT = 50;

/**
 * "parentId" should always refer to the root node.
 * "treeParentId" should refer to the parent as the tree structure.
 */
export type TreeNodeShape = TreeRootShape & {
  treeParentId: string;
  direction: Direction4;
  dropdown?: Direction4;
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
      width: arg.width ?? MIN_WIDTH,
      height: arg.height ?? MIN_HEIGHT,
      textPadding: arg.textPadding ?? createBoxPadding([6, 6, 6, 6]),
      maxWidth: arg.maxWidth ?? 300,
      treeParentId: arg.treeParentId ?? "",
      direction,
      dropdown: arg.dropdown,
      ...getBoxAlignByDirection(direction),
    };
  },
  render(ctx, shape, shapeContext) {
    const treeRoot = shapeContext?.shapeMap[shape.parentId ?? ""];
    if (isTreeRootShape(treeRoot)) {
      const treeParent = shapeContext?.shapeMap[shape.treeParentId];
      if (treeParent && isTreeShapeBase(treeParent)) {
        applyStrokeStyle(ctx, shape.stroke);
        const fromP = getChildConnectionPoint(shape);
        ctx.beginPath();
        ctx.moveTo(fromP.x, fromP.y);

        if (shape.dropdown === 2) {
          const toP = getParentConnectionPoint(treeParent, shape.dropdown);
          const x =
            treeParent.p.x +
            treeParent.width * (treeRoot.id === treeParent.id ? (shape.direction === 3 ? 0.4 : 0.6) : 0.5);
          ctx.lineTo(x, fromP.y);
          ctx.lineTo(x, toP.y);
        } else {
          const toP = getParentConnectionPoint(treeParent, shape.direction);
          ctx.lineTo(toP.x, toP.y);
        }

        ctx.stroke();
      }
    }

    treeRootStruct.render(ctx, shape);
  },
  createSVGElementInfo(shape, shapeContext) {
    const body = treeRootStruct.createSVGElementInfo!(shape, shapeContext)!;
    const treeRoot = shapeContext?.shapeMap[shape.parentId ?? ""];
    if (!isTreeRootShape(treeRoot)) return body;

    const treeParent = shapeContext?.shapeMap[shape.treeParentId];
    if (!treeParent || !isTreeShapeBase(treeParent)) return body;

    const toP = getParentConnectionPoint(treeParent, shape.direction);
    const fromP = getChildConnectionPoint(shape);
    return {
      tag: "g",
      children: [
        {
          tag: "line",
          attributes: {
            x1: fromP.x,
            y1: fromP.y,
            x2: toP.x,
            y2: toP.y,
            ...renderStrokeSVGAttributes(shape.stroke),
          },
        },
        body,
      ],
    };
  },
  immigrateShapeIds(shape, oldToNewIdMap) {
    if (!oldToNewIdMap[shape.treeParentId] || !oldToNewIdMap[shape.parentId ?? ""]) {
      return getPatchTreeRootShape();
    } else {
      return { treeParentId: oldToNewIdMap[shape.treeParentId] };
    }
  },
  refreshRelation(shape, availableIdSet) {
    if (!availableIdSet.has(shape.treeParentId) || !availableIdSet.has(shape.parentId ?? "")) {
      return getPatchTreeRootShape();
    }
  },
  stackOrderDisabled: true,
};

export function isTreeNodeShape(shape: Shape): shape is TreeNodeShape {
  return shape.type === "tree_node";
}

function getPatchTreeRootShape(): Partial<TreeNodeShape> {
  return {
    type: "tree_root",
    direction: undefined,
    treeParentId: undefined,
    vAlign: undefined,
    hAlign: undefined,
  };
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
