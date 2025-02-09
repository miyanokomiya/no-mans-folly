import { AffineMatrix, getRectCenter, IRectangle, IVec2 } from "okageo";
import { FrameShape, isFrameShape } from "../shapes/frame";
import { expandRect, isPointOnRectangle } from "../utils/geometry";
import { ShapeComposite } from "./shapeComposite";
import { applyStrokeStyle, getStrokeWidth } from "../utils/strokeStyle";
import { applyDefaultTextStyle } from "../utils/renderer";
import { COLORS } from "../utils/color";
import { applyFillStyle } from "../utils/fillStyle";
import { getOrderPriority } from "../shapes";
import { CanvasCTX } from "../utils/types";
import { FrameGroup } from "../shapes/frameGroups/core";
import { isFrameAlignGroupShape } from "../shapes/frameGroups/frameAlignGroup";
import { TreeNode } from "../utils/tree";
import { Shape } from "../models";

export function getAllFrameShapes(shapeComposite: ShapeComposite): FrameShape[] {
  return shapeComposite.mergedShapes.filter((s) => isFrameShape(s));
}

export function getFrameShapeIdsInBranches(shapeComposite: ShapeComposite, branchIds: string[]): string[] {
  const allCandidates = shapeComposite.getAllBranchMergedShapes(branchIds);
  return allCandidates.filter((s) => isFrameShape(s)).map((s) => s.id);
}

export function getAllFrameGroupShapes(shapeComposite: ShapeComposite): FrameGroup[] {
  return shapeComposite.mergedShapes.filter((s) => isFrameAlignGroupShape(s));
}

export function getRootShapeIdsByFrame(shapeComposite: ShapeComposite, frame: FrameShape): string[] {
  const frameRect = shapeComposite.getWrapperRect(frame);
  const frameOrderPriority = getOrderPriority(shapeComposite.getShapeStruct, frame);

  return shapeComposite.mergedShapeTree
    .filter((t) => {
      const s = shapeComposite.mergedShapeMap[t.id];
      const orderPriority = getOrderPriority(shapeComposite.getShapeStruct, s);
      if (orderPriority <= frameOrderPriority) return false;

      const rect = shapeComposite.getWrapperRect(s);
      return isPointOnRectangle(frameRect, getRectCenter(rect));
    })
    .map((s) => s.id);
}

export function getRootShapeIdsByFrameGroup(shapeComposite: ShapeComposite, frameGroup: FrameGroup): string[] {
  const idSet = new Set<string>();
  shapeComposite.mergedShapeTreeMap[frameGroup.id]?.children.forEach((c) => {
    const ids = getRootShapeIdsByFrame(shapeComposite, shapeComposite.mergedShapeMap[c.id] as FrameShape);
    ids.forEach((id) => idSet.add(id));
  });
  return Array.from(idSet);
}

export function getFrameRect(frame: FrameShape, includeBorder = false): IRectangle {
  const rect = { x: frame.p.x, y: frame.p.y, width: frame.width, height: frame.height };
  return includeBorder ? expandRect(rect, getStrokeWidth(frame.stroke) / 2) : rect;
}

export function getFrameTree(shapeComposite: ShapeComposite): TreeNode[] {
  return shapeComposite.mergedShapeTree.filter((n) => {
    const s = shapeComposite.shapeMap[n.id];
    return isFrameShape(s) || isFrameAlignGroupShape(s);
  });
}

export function renderFrameNames(ctx: CanvasCTX, shapeComposite: ShapeComposite, scale = 1) {
  const frameTree = getFrameTree(shapeComposite);
  if (frameTree.length === 0) return;

  ctx.textBaseline = "bottom";
  applyDefaultTextStyle(ctx, 18 * scale);
  applyStrokeStyle(ctx, { color: COLORS.WHITE, width: 3 * scale });
  applyFillStyle(ctx, { color: COLORS.BLACK });
  frameTree.forEach((node, i) => renderFrameNameStep(ctx, shapeComposite, node, i, scale));
}

function renderFrameNameStep(
  ctx: CanvasCTX,
  shapeComposite: ShapeComposite,
  node: TreeNode,
  index: number,
  scale: number,
) {
  const shape = shapeComposite.mergedShapeMap[node.id] as FrameShape | FrameGroup;
  const rect = shapeComposite.getWrapperRect(shape, true);
  const text = `${index + 1}. ${shape.name}`;
  const mergin = 4 * scale;
  ctx.strokeText(text, rect.x, rect.y - mergin);
  ctx.fillText(text, rect.x, rect.y - mergin);

  node.children.forEach((c, j) => renderFrameNameStep(ctx, shapeComposite, c, j, scale));
}

export function moveFrameWithContent(
  shapeComposite: ShapeComposite,
  frameId: string,
  p: IVec2,
): { [id: string]: Partial<Shape> } {
  const frame = shapeComposite.shapeMap[frameId] as FrameShape;
  const shapeIds = getRootShapeIdsByFrame(shapeComposite, frame);
  const affine: AffineMatrix = [1, 0, 0, 1, p.x - frame.p.x, p.y - frame.p.y];
  const ret: { [id: string]: Partial<Shape> } = {
    [frameId]: shapeComposite.transformShape(frame, affine),
  };
  shapeIds.forEach((id) => {
    const s = shapeComposite.shapeMap[id];
    ret[id] = shapeComposite.transformShape(s, affine);
  });
  return ret;
}

/**
 * Returned list doesn't contain "targetId".
 */
export function getAllShapeIdsOnTheFrameOrFrameGroup(shapeComposite: ShapeComposite, targetId: string): string[] {
  const idSet = new Set<string>([]);
  const target = shapeComposite.shapeMap[targetId];
  if (isFrameShape(target)) {
    getRootShapeIdsByFrame(shapeComposite, target).forEach((idInFrame) => {
      idSet.add(idInFrame);
    });
  } else {
    shapeComposite.mergedShapeTreeMap[target.id].children.forEach((frameNode) => {
      const frame = shapeComposite.shapeMap[frameNode.id] as FrameShape;
      idSet.add(frame.id);
      getRootShapeIdsByFrame(shapeComposite, frame).forEach((idInFrame) => {
        idSet.add(idInFrame);
      });
    });
  }

  return shapeComposite.getAllBranchMergedShapes(Array.from(idSet)).map((s) => s.id);
}
