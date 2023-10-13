import { IVec2, getDistance, isSame } from "okageo";
import { getWrapperRect } from "../shapes";
import { TreeNodeShape, isTreeNodeShape } from "../shapes/treeNode";
import { TreeRootShape, isTreeRootShape } from "../shapes/treeRoot";
import { ShapeComposite } from "./shapeComposite";
import { Direction4, StyleScheme } from "../models";
import { applyFillStyle } from "../utils/fillStyle";
import { TAU } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";

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
