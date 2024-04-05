import { IVec2, getDistance, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU, getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyLocalSpace } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { SimplePolygonShape } from "../../shapes/simplePolygon";

export const ANCHOR_SIZE = 6;

type HitAnchor = [type: string, IVec2];

interface SimplePolygonHitResult {
  type: string;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
  getAnchors: (scale: number) => HitAnchor[];
}

export const newSimplePolygonHandler = defineShapeHandler<SimplePolygonHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as SimplePolygonShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  const getAnchors = option.getAnchors;

  function hitTest(p: IVec2, scale = 1): SimplePolygonHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const anchors = getAnchors(scale);
    const adjustedP = sub(rotateFn(p, true), shape.p);

    const hit = anchors.find((a) => getDistance(a[1], adjustedP) <= threshold);
    if (hit) {
      return { type: hit[0] };
    }
  }

  function render(
    ctx: CanvasRenderingContext2D,
    style: StyleScheme,
    scale: number,
    hitResult?: SimplePolygonHitResult,
  ) {
    const threshold = ANCHOR_SIZE * scale;
    const anchors = getAnchors(scale);
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
