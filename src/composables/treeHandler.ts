import { IRectangle, IVec2, getDistance, getRectCenter, isSame } from "okageo";
import { getWrapperRect } from "../shapes";
import { TreeNodeShape, isTreeNodeShape } from "../shapes/tree/treeNode";
import { TreeRootShape, isTreeRootShape } from "../shapes/tree/treeRoot";
import { ShapeComposite } from "./shapeComposite";
import { Direction4, EntityPatchInfo, Shape, StyleScheme } from "../models";
import { applyFillStyle } from "../utils/fillStyle";
import { TAU, getDistanceBetweenPointAndRect } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { CHILD_MARGIN, SIBLING_MARGIN, TreeLayoutNode, treeLayout } from "../utils/layouts/tree";
import { flatTree, getAllBranchIds, getTree } from "../utils/tree";
import { TreeShapeBase, isTreeShapeBase } from "../shapes/tree/core";
import { generateKeyBetween } from "fractional-indexing";

const ANCHOR_SIZE = 10;
const ANCHOR_MARGIN = 30;

export interface TreeHitResult {
  direction: Direction4;
  p: IVec2;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export function newTreeHandler(option: Option) {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as TreeRootShape | TreeNodeShape;
  const isRoot = isTreeRootShape(shape);
  const direction = isTreeNodeShape(shape) ? shape.direction : 0;
  const bounds = getWrapperRect(shapeComposite.getShapeStruct, shape);

  function getAnchors(scale: number): [Direction4, IVec2][] {
    const margin = ANCHOR_MARGIN * scale;
    if (isRoot) {
      return [
        [1, { x: bounds.x + bounds.width + margin, y: bounds.y + bounds.height / 2 }],
        [3, { x: bounds.x - margin, y: bounds.y + bounds.height / 2 }],
      ];
    }

    switch (direction) {
      case 3:
        return [[3, { x: bounds.x - margin, y: bounds.y + bounds.height / 2 }]];
      default:
        return [[1, { x: bounds.x + bounds.width + margin, y: bounds.y + bounds.height / 2 }]];
    }
  }

  function hitTest(p: IVec2, scale = 1): TreeHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;

    const anchor = getAnchors(scale).find((a) => getDistance(a[1], p) <= threshold);
    if (!anchor) return;
    return { direction: anchor[0], p: anchor[1] };
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: TreeHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    applyFillStyle(ctx, { color: style.selectionPrimary });
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 2 * scale });

    ctx.beginPath();
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    const anchors = getAnchors(scale);
    anchors.forEach(([d, p]) => {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      switch (d) {
        case 3:
          ctx.lineTo(bounds.x, p.y);
          break;
        default:
          ctx.lineTo(bounds.x + bounds.width, p.y);
          break;
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, threshold, 0, TAU);
      ctx.fill();
    });

    if (hitResult) {
      applyFillStyle(ctx, { color: style.selectionSecondaly });
      ctx.beginPath();
      ctx.arc(hitResult.p.x, hitResult.p.y, threshold, 0, TAU);
      ctx.fill();
    }
  }

  return { hitTest, render };
}
export type TreeHandler = ReturnType<typeof newTreeHandler>;

export function isSameTreeHitResult(a?: TreeHitResult, b?: TreeHitResult): boolean {
  if (a && b) {
    return a?.direction === b?.direction && isSame(a.p, b.p);
  }

  return !a && !b;
}

export interface TreeNodeMovingResult {
  treeParentId: string;
  direction: Direction4;
  findex: string;
}

export function newTreeNodeMovingHandler(option: Option) {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as TreeNodeShape;
  const root = shapeComposite.shapeMap[shape.parentId!] as TreeRootShape;

  const tree = shapeComposite.mergedShapeTreeMap[root.id];
  const allIds = flatTree([shapeComposite.mergedShapeTreeMap[root.id]]).map((t) => t.id);
  const allShapeNodes = tree.children.map((t) => shapeComposite.shapeMap[t.id] as TreeNodeShape);

  const ownBranchIdSet = new Set(getTreeBranchIds(shapeComposite, [shape.id]));
  const candidateIds = allIds.filter((id) => !ownBranchIdSet.has(id));

  const rects = candidateIds.map<[string, IRectangle]>((id) => [
    id,
    getWrapperRect(shapeComposite.getShapeStruct, shapeComposite.shapeMap[id]),
  ]);

  function moveTest(p: IVec2): TreeNodeMovingResult | undefined {
    if (rects.length === 0) return;

    const evaluated = rects.map<[string, IRectangle, number]>(([id, rect]) => [
      id,
      rect,
      getDistanceBetweenPointAndRect(p, rect),
    ]);
    const [closestId, closestRect] = evaluated.sort((a, b) => a[2] - b[2])[0];
    if (option.targetId === closestId) return;

    const closest = shapeComposite.shapeMap[closestId] as TreeShapeBase;
    const closestRectCenter = getRectCenter(closestRect);
    if (isTreeRootShape(closest)) {
      // TODO
      return;
    } else {
      const closestNode = closest as TreeNodeShape;
      const siblings = allShapeNodes.filter(
        (s) => s.treeParentId === closestNode.treeParentId && s.direction === closestNode.direction,
      );
      const index = siblings.findIndex((c) => c.id === closestId);

      // TODO: Vertical
      if (closestNode.direction === 1 || closestNode.direction === 3) {
        if (closestNode.direction === 1) {
          if (closestRect.x + closestRect.width < p.x) {
            const childrenOfClosest = allShapeNodes.filter((s) => s.treeParentId === closestNode.id);
            if (childrenOfClosest.length === 0) {
              // Case: Insert as a child & The parent has no children
              return {
                treeParentId: closestNode.id,
                direction: closestNode.direction,
                findex: generateKeyBetween(closestNode.findex, null),
              };
            }
          }
        } else {
          if (p.x < closestRect.x) {
            const childrenOfClosest = allShapeNodes.filter((s) => s.treeParentId === closestNode.id);
            if (childrenOfClosest.length === 0) {
              // Case: Insert as a child & The parent has no children
              return {
                treeParentId: closestNode.id,
                direction: closestNode.direction,
                findex: generateKeyBetween(closestNode.findex, null),
              };
            }
          }
        }

        if (p.y < closestRectCenter.y) {
          if (index > 0) {
            // Case: Insert as an intermediate child
            const prev = shapeComposite.shapeMap[siblings[index - 1].id];
            if (prev.id === shape.id) return;

            return {
              treeParentId: closestNode.treeParentId,
              direction: closestNode.direction,
              findex: generateKeyBetween(prev.findex, closestNode.findex),
            };
          } else {
            // Case: Insert as the first child
            return {
              treeParentId: closestNode.treeParentId,
              direction: closestNode.direction,
              findex: generateKeyBetween(null, closestNode.findex),
            };
          }
        } else {
          if (index < siblings.length - 1) {
            // Case: Insert as an intermediate child
            const next = shapeComposite.shapeMap[siblings[index + 1].id];
            if (next.id === shape.id) return;

            return {
              treeParentId: closestNode.treeParentId,
              direction: closestNode.direction,
              findex: generateKeyBetween(closestNode.findex, next.findex),
            };
          } else {
            // Case: Insert as the last child
            return {
              treeParentId: closestNode.treeParentId,
              direction: closestNode.direction,
              findex: generateKeyBetween(closestNode.findex, null),
            };
          }
        }
      }
    }
  }

  function render(
    ctx: CanvasRenderingContext2D,
    style: StyleScheme,
    scale: number,
    movingResult?: TreeNodeMovingResult,
  ) {
    if (!movingResult) return;

    applyFillStyle(ctx, { color: style.selectionPrimary });
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: scale * 2 });

    const treeParent = shapeComposite.shapeMap[movingResult.treeParentId];
    const treeParentRect = getWrapperRect(shapeComposite.getShapeStruct, treeParent);
    const siblings = allShapeNodes.filter(
      (s) => s.treeParentId === treeParent.id && s.direction === movingResult.direction,
    );
    const _nextIndex = siblings.findIndex((s) => movingResult.findex < s.findex);
    const nextIndex = _nextIndex === -1 ? siblings.length : _nextIndex;

    renderMovingPreview(
      ctx,
      movingResult.direction,
      treeParentRect,
      nextIndex > 0 ? getWrapperRect(shapeComposite.getShapeStruct, siblings[nextIndex - 1]) : undefined,
      nextIndex < siblings.length ? getWrapperRect(shapeComposite.getShapeStruct, siblings[nextIndex]) : undefined,
    );
  }

  return { moveTest, render };
}
export type TreeNodeMovingHandler = ReturnType<typeof newTreeNodeMovingHandler>;

export function isSameTreeNodeMovingResult(a?: TreeNodeMovingResult, b?: TreeNodeMovingResult): boolean {
  if (a && b) {
    return a.direction === b.direction && a.treeParentId === b.treeParentId && a.findex === b.findex;
  }

  return !a && !b;
}

function toLayoutNode(shapeComposite: ShapeComposite, shape: TreeShapeBase): TreeLayoutNode {
  const rect = getWrapperRect(shapeComposite.getShapeStruct, shape);
  if (isTreeNodeShape(shape)) {
    return {
      id: shape.id,
      findex: shape.findex,
      type: "node",
      rect,
      direction: shape.direction,
      parentId: shape.treeParentId,
    };
  } else {
    return { id: shape.id, findex: shape.findex, type: "root", rect, direction: 0, parentId: "" };
  }
}

function toLayoutNodes(shapeComposite: ShapeComposite, rootId: string): TreeLayoutNode[] {
  const tree = shapeComposite.mergedShapeTreeMap[rootId];
  const layoutNodes: TreeLayoutNode[] = [];
  flatTree([tree]).forEach((t) => {
    const s = shapeComposite.mergedShapeMap[t.id];
    if (!isTreeShapeBase(s)) return;
    const node = toLayoutNode(shapeComposite, s);
    if (!node.parentId || shapeComposite.mergedShapeMap[node.parentId]) {
      layoutNodes.push(node);
    } else {
      // Fallback when a parent doesn't exist for whatever reason.
      layoutNodes.push({ ...node, parentId: rootId });
    }
  });
  return layoutNodes;
}

/**
 * Returns shape ids that belong to the the branches of the targets. The targets included.
 */
export function getTreeBranchIds(shapeComposite: ShapeComposite, targetIds: string[]): string[] {
  if (targetIds.length === 0) return [];

  const indexShape = shapeComposite.mergedShapeMap[targetIds[0]];
  const layoutNodes = toLayoutNodes(shapeComposite, indexShape.parentId || indexShape.id);
  return getAllBranchIds(flatTree(getTree(layoutNodes)), targetIds);
}

export function getNextTreeLayout(shapeComposite: ShapeComposite, rootId: string): { [id: string]: Partial<Shape> } {
  const layoutNodes = toLayoutNodes(shapeComposite, rootId);
  const result = treeLayout(layoutNodes);
  const ret: { [id: string]: Partial<Shape> } = {};
  result.forEach((r) => {
    if (!isSame(r.rect, shapeComposite.shapeMap[r.id].p)) {
      ret[r.id] = { p: { x: r.rect.x, y: r.rect.y } };
    }
  });

  return ret;
}

export function getTreeLayoutPatchFunctions(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
) {
  const targetTreeRootIdSet = new Set<string>();

  if (patchInfo.add) {
    patchInfo.add.forEach((shape) => {
      if (isTreeRootShape(shape)) {
        targetTreeRootIdSet.add(shape.id);
      } else if (isTreeNodeShape(shape) && shape.parentId) {
        targetTreeRootIdSet.add(shape.parentId);
      }
    });
  }

  if (patchInfo.update) {
    Object.keys(patchInfo.update).forEach((id) => {
      const shape = srcComposite.shapeMap[id];
      if (isTreeRootShape(shape)) {
        targetTreeRootIdSet.add(shape.id);
      } else if (isTreeNodeShape(shape) && shape.parentId) {
        targetTreeRootIdSet.add(shape.parentId);
      }
    });
  }

  if (patchInfo.delete) {
    patchInfo.delete.forEach((id) => {
      const shape = srcComposite.shapeMap[id];
      if (isTreeNodeShape(shape) && shape.parentId) {
        targetTreeRootIdSet.add(shape.parentId);
      }
    });
  }

  return Array.from(targetTreeRootIdSet).map((id) => {
    return () => getNextTreeLayout(updatedComposite, id);
  });
}

function renderMovingPreview(
  ctx: CanvasRenderingContext2D,
  direction: Direction4,
  parentRect: IRectangle,
  prevRect?: IRectangle,
  nextRect?: IRectangle,
) {
  const siblingMargin = SIBLING_MARGIN;
  const childMargin = CHILD_MARGIN;
  const anchorWidth = 50;
  const anchorHeight = 16;

  switch (direction) {
    case 3: {
      const renderAnchor = (base: IVec2) => {
        ctx.beginPath();
        ctx.rect(base.x - anchorWidth, base.y - anchorHeight / 2, anchorWidth, anchorHeight);
        ctx.fill();
      };

      const x = parentRect.x - childMargin;
      ctx.beginPath();
      ctx.moveTo(parentRect.x, parentRect.y + parentRect.height / 2);

      if (!prevRect && !nextRect) {
        // Case: Insert as a child & The parent has no children
        const to = {
          x,
          y: parentRect.y + parentRect.height / 2,
        };
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        renderAnchor(to);
      } else if (prevRect && nextRect) {
        // Case: Insert as an intermediate child
        const y = (prevRect.y + prevRect.height + nextRect.y) / 2;
        ctx.lineTo(x, y);
        ctx.stroke();
        renderAnchor({ x, y });
      } else if (prevRect) {
        // Case: Insert as the last child
        const y = prevRect.y + prevRect.height + siblingMargin / 2;
        ctx.lineTo(x, y);
        ctx.stroke();
        renderAnchor({ x, y });
      } else if (nextRect) {
        // Case: Insert as the first child
        const y = nextRect.y - siblingMargin / 2;
        ctx.lineTo(x, y);
        ctx.stroke();
        renderAnchor({ x, y });
      }
      return;
    }
    default: {
      const renderAnchor = (base: IVec2) => {
        ctx.beginPath();
        ctx.rect(base.x, base.y - anchorHeight / 2, anchorWidth, anchorHeight);
        ctx.fill();
      };

      ctx.beginPath();
      ctx.moveTo(parentRect.x + parentRect.width, parentRect.y + parentRect.height / 2);

      if (!prevRect && !nextRect) {
        // Case: Insert as a child & The parent has no children
        const to = {
          x: parentRect.x + parentRect.width + childMargin,
          y: parentRect.y + parentRect.height / 2,
        };
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        renderAnchor(to);
      } else if (prevRect && nextRect) {
        // Case: Insert as an intermediate child
        const y = (prevRect.y + prevRect.height + nextRect.y) / 2;
        ctx.lineTo(nextRect.x, y);
        ctx.stroke();
        renderAnchor({ x: nextRect.x, y });
      } else if (prevRect) {
        // Case: Insert as the last child
        const y = prevRect.y + prevRect.height + siblingMargin / 2;
        ctx.lineTo(prevRect.x, y);
        ctx.stroke();
        renderAnchor({ x: prevRect.x, y });
      } else if (nextRect) {
        // Case: Insert as the first child
        const y = nextRect.y - siblingMargin / 2;
        ctx.lineTo(nextRect.x, y);
        ctx.stroke();
        renderAnchor({ x: nextRect.x, y });
      }
      return;
    }
  }
}
