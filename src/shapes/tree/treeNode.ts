import { IVec2, add, pathSegmentRawsToString, sub } from "okageo";
import { BoxAlign, Direction4, Shape } from "../../models";
import { createFillStyle } from "../../utils/fillStyle";
import { applyStrokeStyle, createStrokeStyle, renderStrokeSVGAttributes } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "../core";
import { isTreeRootShape, struct as treeRootStruct } from "./treeRoot";
import { TreeShapeBase, isTreeShapeBase, resizeTreeShape, resizeTreeShapeOnTextEdit } from "./core";
import { createBoxPadding } from "../../utils/boxPadding";
import { applyLocalSpace, applyPath, createSVGCurvePath } from "../../utils/renderer";
import { getRectRotateFn } from "../../utils/geometry";
import { getShapeTransform, getRectShapeCenter, getRectShapeRect } from "../rectPolygon";
import { renderTransform } from "../../utils/svgElements";

const MIN_WIDTH = 120;
const MIN_HEIGHT = 50;

/**
 * "parentId" should always refer to the root node.
 * "treeParentId" should refer to the parent as the tree structure.
 */
export type TreeNodeShape = TreeShapeBase & {
  treeParentId: string;
  direction: Direction4;
  // As for dropdown, only 0 or 2 are valid and other values should be treated as 2.
  // When dropdown has value, direction can be either 1 or 3 and other values should be treated as 1.
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
      const treeRotation = treeRoot.rotation;
      const treeParent = shapeContext?.shapeMap[shape.treeParentId];
      if (treeParent && isTreeShapeBase(treeParent)) {
        const parentRect = { x: treeParent.p.x, y: treeParent.p.y, width: treeParent.width, height: treeParent.height };
        applyLocalSpace(ctx, parentRect, treeRotation, () => {
          applyStrokeStyle(ctx, shape.stroke);
          ctx.beginPath();
          applyPath(ctx, getConnectorLocalPath(shape, treeParent, treeRotation));
          ctx.stroke();
        });
      }
    }

    treeRootStruct.render(ctx, shape);
  },
  createSVGElementInfo(shape, shapeContext) {
    const body = treeRootStruct.createSVGElementInfo!(shape, shapeContext)!;
    const treeRoot = shapeContext?.shapeMap[shape.parentId ?? ""];
    if (!isTreeRootShape(treeRoot)) return body;

    const treeRotation = treeRoot.rotation;
    const treeParent = shapeContext?.shapeMap[shape.treeParentId];
    if (!treeParent || !isTreeShapeBase(treeParent)) return body;

    return {
      tag: "g",
      children: [
        {
          tag: "path",
          attributes: {
            transform: renderTransform(getShapeTransform({ ...treeParent, rotation: treeRotation })),
            d: pathSegmentRawsToString(createSVGCurvePath(getConnectorLocalPath(shape, treeParent, treeRotation))),
            fill: "none",
            ...renderStrokeSVGAttributes(shape.stroke),
          },
        },
        body,
      ],
    };
  },
  resize(shape, resizingAffine) {
    return resizeTreeShape(shape, resizingAffine, MIN_WIDTH, MIN_HEIGHT);
  },
  resizeOnTextEdit(shape, textBoxSize) {
    return resizeTreeShapeOnTextEdit(shape, textBoxSize, MIN_WIDTH, MIN_HEIGHT);
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

function getConnectorLocalPath(shape: TreeNodeShape, treeParent: TreeShapeBase, treeRotation: number): IVec2[] {
  const parentC = getRectShapeCenter(treeParent);
  const parentRotateFn = getRectRotateFn(treeRotation, parentC);
  const shapeRect = getRectShapeRect(shape);
  const rotatedShapeRect = parentRotateFn(shapeRect, true);

  const adjustedShape = treeRotation === 0 ? shape : { ...shape, p: { x: rotatedShapeRect.x, y: rotatedShapeRect.y } };

  const fromP = getChildConnectionPoint(adjustedShape);
  const path = [fromP];

  if (adjustedShape.dropdown !== undefined) {
    const toP = getParentConnectionPoint(treeParent, adjustedShape.dropdown);
    const marginRate =
      isTreeRootShape(treeParent) && treeParent.childMargin
        ? Math.min(0.1, treeParent.childMargin / treeParent.width)
        : 0;
    const x = treeParent.p.x + treeParent.width * (adjustedShape.direction === 3 ? 0.5 - marginRate : 0.5 + marginRate);
    path.push({ x, y: fromP.y });
    path.push({ x, y: toP.y });
  } else {
    path.push(getParentConnectionPoint(treeParent, adjustedShape.direction));
  }

  return path.map((p) => sub(p, treeParent.p));
}
