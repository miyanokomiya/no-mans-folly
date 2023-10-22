import { IRectangle, IVec2, add } from "okageo";
import { Direction2 } from "../../models";
import { TreeNode, getTree } from "../tree";
import { LayoutFn, LayoutNode } from "./core";
import { getWrapperRect } from "../geometry";

const EMPTY_SIZE = 100;

export type AlignLayoutNode = AlignLayoutBox | AlignLayoutEntity;

interface AlignLayoutBase extends LayoutNode {
  parentId: string;
}

/**
 * Entities have solid size.
 */
export interface AlignLayoutEntity extends AlignLayoutBase {
  type: "entity";
}

/**
 * Boxes have flexible size towards other direction.
 * e.g. When a box's direction is vertical, its width changes along with its content.
 */
export interface AlignLayoutBox extends AlignLayoutBase {
  type: "box";
  direction: Direction2;
  gap: number;
}

export const alignLayout: LayoutFn<AlignLayoutNode> = (src) => {
  const nodeMap = new Map(src.map((n) => [n.id, n]));
  const treeRoots = getTree(src);
  const map = getAlignRectMap(nodeMap, treeRoots);
  return src.map((n) => ({ ...n, rect: map.get(n.id)! }));
};

export function getAlignRectMap(nodeMap: Map<string, AlignLayoutNode>, treeRoots: TreeNode[]): Map<string, IRectangle> {
  const relativeMap = getAlignRelativeRectMap(nodeMap, treeRoots);
  return toAbsoleteRectMap(nodeMap, relativeMap, treeRoots);
}

function toAbsoleteRectMap(
  nodeMap: Map<string, AlignLayoutNode>,
  relativeMap: Map<string, IRectangle>,
  treeRoots: TreeNode[],
): Map<string, IRectangle> {
  const ret = new Map<string, IRectangle>();
  treeRoots.forEach((t) => {
    const node = nodeMap.get(t.id)!;
    toAbsoleteRectMapStep(ret, relativeMap, t, node.rect);
  });
  return ret;
}

function toAbsoleteRectMapStep(
  ret: Map<string, IRectangle>,
  relativeMap: Map<string, IRectangle>,
  treeNode: TreeNode,
  offset: IVec2,
) {
  const rect = relativeMap.get(treeNode.id)!;
  const newOffset = add(offset, rect);

  treeNode.children.forEach((c) => {
    toAbsoleteRectMapStep(ret, relativeMap, c, newOffset);
  });

  ret.set(treeNode.id, { ...rect, x: rect.x + offset.x, y: rect.y + offset.y });
}

/**
 * Returns relative rectangle map of nodes.
 * Each rectangle is relatively located base on its parent.
 */
export function getAlignRelativeRectMap(
  nodeMap: Map<string, AlignLayoutNode>,
  treeRoots: TreeNode[],
): Map<string, IRectangle> {
  const ret = new Map<string, IRectangle>();

  treeRoots.forEach((t) => {
    calcAlignRectMapForRoot(ret, nodeMap, t);
  });

  return ret;
}

function calcAlignRectMapForRoot(
  ret: Map<string, IRectangle>,
  nodeMap: Map<string, AlignLayoutNode>,
  treeNode: TreeNode,
  options = {
    emptySize: EMPTY_SIZE,
  },
) {
  const node = nodeMap.get(treeNode.id)!;
  if (node.type === "box") {
    calcAlignRectMap(ret, nodeMap, treeNode, node.direction, { x: 0, y: 0 }, node.rect.height, options);
  } else {
    ret.set(node.id, node.rect);
  }
}

function calcAlignRectMap(
  ret: Map<string, IRectangle>,
  nodeMap: Map<string, AlignLayoutNode>,
  treeNode: TreeNode,
  direction: Direction2,
  from: IVec2,
  remain: number,
  options = {
    emptySize: EMPTY_SIZE,
  },
): boolean | undefined {
  const node = nodeMap.get(treeNode.id)!;
  if (node.type === "box") {
    if (node.direction === 0) {
      let x = from.x;
      let y = 0;
      let maxWidth = 0;
      treeNode.children.forEach((c, i) => {
        const result = calcAlignRectMap(ret, nodeMap, c, node.direction, { x, y }, node.rect.height - y);
        if (!result) {
          const crect = ret.get(c.id)!;
          maxWidth = Math.max(maxWidth, crect.width);
          y += crect.height + node.gap;
        } else {
          // Should break line once
          if (i > 0) {
            x += maxWidth + node.gap;
            y = 0;
          }
          calcAlignRectMap(ret, nodeMap, c, node.direction, { x, y }, Infinity);
          const crect = ret.get(c.id)!;
          maxWidth = crect.width;
          y += crect.height + node.gap;
        }
      });

      if (treeNode.children.length > 0) {
        const rect = getWrapperRect(treeNode.children.map((c) => ret.get(c.id)!));
        ret.set(node.id, { ...node.rect, ...from, width: rect.width });
      } else {
        ret.set(node.id, { ...node.rect, ...from, width: options.emptySize });
      }
    }
  } else {
    if (direction === 0) {
      if (remain < node.rect.height) return true;
    } else {
      if (remain < node.rect.width) return true;
    }
    ret.set(node.id, { ...node.rect, ...from });
  }
}
