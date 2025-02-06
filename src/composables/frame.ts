import { getRectCenter, IRectangle } from "okageo";
import { FrameShape, isFrameShape } from "../shapes/frame";
import { expandRect, isPointOnRectangle } from "../utils/geometry";
import { ShapeComposite } from "./shapeComposite";
import { applyStrokeStyle, getStrokeWidth } from "../utils/strokeStyle";
import { applyDefaultTextStyle } from "../utils/renderer";
import { COLORS } from "../utils/color";
import { applyFillStyle } from "../utils/fillStyle";
import { GetShapeStruct } from "../shapes/core";
import { createShape, getOrderPriority } from "../shapes";
import { CanvasCTX } from "../utils/types";
import { FrameGroup } from "../shapes/frameGroups/core";
import { isFrameAlignGroupShape } from "../shapes/frameGroups/frameAlignGroup";
import { TreeNode } from "../utils/tree";

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

export function createNewFrameFromSrc(
  getStruct: GetShapeStruct,
  src: FrameShape,
  id: string,
  findex: string,
): FrameShape {
  const ret = createShape<FrameShape>(getStruct, "frame", {
    id,
    findex,
    parentId: src.parentId,
    width: src.width,
    height: src.height,
    fill: src.fill,
    stroke: src.stroke,
    p: { x: src.p.x, y: src.p.y + src.height + 50 },
  });

  return ret;
}
