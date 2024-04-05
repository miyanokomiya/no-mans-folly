import { IVec2, getDistance, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU, getRadianForDirection4, getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyLocalSpace, applyPath, renderSwitchDirection } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { SimplePolygonShape, getShapeDirection } from "../../shapes/simplePolygon";
import { COLORS } from "../../utils/color";

export const ANCHOR_SIZE = 6;
const DIRECTION_ANCHOR_SIZE = 10;

type HitAnchor = [type: string, IVec2];

interface SimplePolygonHitResult {
  type: string;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
  getAnchors: (scale: number) => HitAnchor[];
  direction4?: boolean;
}

export const newSimplePolygonHandler = defineShapeHandler<SimplePolygonHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as SimplePolygonShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  const getAnchors = option.getAnchors;

  function getDirection4Anchor(scale: number): HitAnchor | undefined {
    const d = DIRECTION_ANCHOR_SIZE * 2 * scale;
    return option.direction4 ? ["direction4", { x: shapeRect.width + d, y: shapeRect.height + d }] : undefined;
  }

  function hitTest(p: IVec2, scale = 1): SimplePolygonHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const anchors = getAnchors(scale);
    const adjustedP = sub(rotateFn(p, true), shape.p);

    const hit = anchors.find((a) => getDistance(a[1], adjustedP) <= threshold);
    if (hit) {
      return { type: hit[0] };
    }

    const direction4Anchor = getDirection4Anchor(scale);
    const directionThreshold = DIRECTION_ANCHOR_SIZE * scale;
    if (direction4Anchor && getDistance(direction4Anchor[1], adjustedP) <= directionThreshold) {
      return { type: direction4Anchor[0] };
    }
  }

  function render(
    ctx: CanvasRenderingContext2D,
    style: StyleScheme,
    scale: number,
    hitResult?: SimplePolygonHitResult,
  ) {
    const threshold = ANCHOR_SIZE * scale;
    const directionThreshold = DIRECTION_ANCHOR_SIZE * scale;
    const anchors = getAnchors(scale);
    const direction4Anchor = getDirection4Anchor(scale);

    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      anchors
        .map<[IVec2, boolean]>((a) => [a[1], a[0] === hitResult?.type])
        .forEach(([p, highlight]) => {
          if (highlight) {
            applyFillStyle(ctx, { color: style.selectionSecondaly });
            applyStrokeStyle(ctx, { color: style.selectionSecondaly });
          } else {
            applyFillStyle(ctx, { color: style.selectionPrimary });
            applyStrokeStyle(ctx, { color: style.selectionPrimary });
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, threshold, 0, TAU);
          ctx.fill();
        });

      if (direction4Anchor) {
        if (hitResult?.type === direction4Anchor[0]) {
          applyFillStyle(ctx, { color: style.selectionSecondaly });
        } else {
          applyFillStyle(ctx, { color: style.selectionPrimary });
        }
        ctx.beginPath();
        ctx.arc(direction4Anchor[1].x, direction4Anchor[1].y, directionThreshold, 0, TAU);
        ctx.fill();
        applyFillStyle(ctx, { color: COLORS.WHITE });
        renderSwitchDirection(
          ctx,
          direction4Anchor[1],
          getRadianForDirection4(getShapeDirection(shape)),
          directionThreshold,
        );
      }
    });
  }

  return {
    hitTest,
    render,
    isSameHitResult: (a, b) => {
      return a?.type === b?.type;
    },
  };
});
export type SimplePolygonHandler = ReturnType<typeof newSimplePolygonHandler>;

export function renderShapeBounds(ctx: CanvasRenderingContext2D, style: StyleScheme, path: IVec2[]) {
  applyStrokeStyle(ctx, { color: style.selectionPrimary });
  ctx.beginPath();
  applyPath(ctx, path, true);
  ctx.stroke();
}
