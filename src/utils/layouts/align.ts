import { IRectangle, IVec2, MINVALUE, add } from "okageo";
import { BoxValues4, Direction2 } from "../../models";
import { TreeNode, getTree } from "../tree";
import { LayoutFn, LayoutNode } from "./core";
import { getWrapperRect } from "../geometry";
import { getNegativePaddingRect } from "../boxPadding";

const EMPTY_SIZE = 180;

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
  gapC?: number;
  gapR?: number;
  /**
   * When direction is 0, baseWidth is used as minimum width, baseHeight is used as fixed height vice versa.
   * "undefined" means optimal to its content.
   */
  baseWidth?: number;
  baseHeight?: number;
  padding?: BoxValues4; // absolete values
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

/**
 * Returns "true" when the node's size is over "remain".
 * => It means, this node should be located in the next line.
 */
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
    const gapC = node.gapC ?? 0;
    const gapR = node.gapR ?? 0;
    const paddingL = node.padding?.[3] ?? 0;
    const paddingT = node.padding?.[0] ?? 0;
    let x = paddingL;
    let y = paddingT;

    if (node.direction === 0) {
      let maxWidth = 0;
      treeNode.children.forEach((c, i) => {
        const result = calcAlignRectMap(
          ret,
          nodeMap,
          c,
          node.direction,
          { x, y },
          node.baseHeight === undefined
            ? Infinity
            : // Add extra room to absorb rounding error
              node.rect.height - y - (node.padding ? node.padding[0] - node.padding[2] : 0) + MINVALUE,
        );

        if (!result) {
          const crect = ret.get(c.id)!;
          maxWidth = Math.max(maxWidth, crect.width);
          y += crect.height + gapR;
        } else {
          // Should break line once
          if (i > 0) {
            x += maxWidth + gapC;
            y = paddingT;
          }
          const crect = ret.get(c.id)!;
          ret.set(c.id, { ...crect, x, y });
          maxWidth = crect.width;
          y += crect.height + gapR;
        }
      });

      const childWrapperRect =
        treeNode.children.length > 0 ? getWrapperRect(treeNode.children.map((c) => ret.get(c.id)!)) : undefined;
      const rect = childWrapperRect
        ? getNegativePaddingRect(node.padding ? { value: node.padding } : undefined, childWrapperRect)
        : { ...node.rect, ...from, width: options.emptySize, height: options.emptySize };
      ret.set(node.id, {
        ...node.rect,
        ...from,
        width: node.baseWidth === undefined ? rect.width : Math.max(rect.width, node.baseWidth),
        height: node.baseHeight === undefined ? rect.height : Math.max(rect.height, node.baseHeight),
      });
    } else {
      let maxHeight = 0;
      treeNode.children.forEach((c, i) => {
        const result = calcAlignRectMap(
          ret,
          nodeMap,
          c,
          node.direction,
          { x, y },
          node.baseWidth === undefined
            ? Infinity
            : // Add extra room to absorb rounding error
              node.rect.width - x - (node.padding ? node.padding[1] - node.padding[3] : 0) + MINVALUE,
        );

        if (!result) {
          const crect = ret.get(c.id)!;
          maxHeight = Math.max(maxHeight, crect.height);
          x += crect.width + gapC;
        } else {
          // Should break line once
          if (i > 0) {
            x = paddingL;
            y += maxHeight + gapR;
          }
          const crect = ret.get(c.id)!;
          ret.set(c.id, { ...crect, x, y });
          maxHeight = crect.height;
          x += crect.width + gapC;
        }
      });

      const childWrapperRect =
        treeNode.children.length > 0 ? getWrapperRect(treeNode.children.map((c) => ret.get(c.id)!)) : undefined;
      const rect = childWrapperRect
        ? getNegativePaddingRect(node.padding ? { value: node.padding } : undefined, childWrapperRect)
        : { ...node.rect, ...from, width: options.emptySize, height: options.emptySize };
      ret.set(node.id, {
        ...node.rect,
        ...from,
        width: node.baseWidth === undefined ? rect.width : Math.max(rect.width, node.baseWidth),
        height: node.baseHeight === undefined ? rect.height : Math.max(rect.height, node.baseHeight),
      });
    }
  } else {
    ret.set(node.id, { ...node.rect, ...from });
  }

  const rect = ret.get(treeNode.id)!;
  if (direction === 0) {
    return remain < rect.height;
  } else {
    return remain < rect.width;
  }
}
