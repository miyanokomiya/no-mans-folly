import { IVec2, getDistance, getRadian, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU, getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyLocalSpace, renderValueLabel } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { ParallelogramShape } from "../../shapes/polygons/parallelogram";

const ANCHOR_SIZE = 6;

type AnchorType = "c0" | "left" | "right";

interface ParallelogramHitResult {
  type: AnchorType;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newParallelogramHandler = defineShapeHandler<ParallelogramHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as ParallelogramShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  function getAnchors() {
    const controlSizeP = { x: shape.width * shape.c0.x, y: 0 };
    const controlLeftP = { x: 0, y: shape.height / 2 };
    const controlRightP = { x: shape.width, y: shape.height / 2 };
    return { controlSizeP, controlLeftP, controlRightP };
  }

  function hitTest(p: IVec2, scale = 1): ParallelogramHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const { controlSizeP, controlLeftP, controlRightP } = getAnchors();
    const adjustedP = sub(rotateFn(p, true), shape.p);

    if (getDistance(controlSizeP, adjustedP) <= threshold) {
      return { type: "c0" };
    }
    if (getDistance(controlLeftP, adjustedP) <= threshold) {
      return { type: "left" };
    }
    if (getDistance(controlRightP, adjustedP) <= threshold) {
      return { type: "right" };
    }
  }

  function render(
    ctx: CanvasRenderingContext2D,
    style: StyleScheme,
    scale: number,
    hitResult?: ParallelogramHitResult,
  ) {
    const threshold = ANCHOR_SIZE * scale;
    const { controlSizeP, controlLeftP, controlRightP } = getAnchors();
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      (
        [
          [controlSizeP, hitResult?.type === "c0"],
          [controlLeftP, hitResult?.type === "left"],
          [controlRightP, hitResult?.type === "right"],
        ] as const
      ).forEach(([p, highlight]) => {
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

export function renderMovingParallelogramAnchor(
  ctx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: ParallelogramShape,
  showLabel = false,
) {
  const threshold = ANCHOR_SIZE * scale;
  const c = { x: shape.width / 2, y: shape.height / 2 };
  const p = { x: shape.width * shape.c0.x, y: 0 };

  applyLocalSpace(ctx, { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height }, shape.rotation, () => {
    if (showLabel) {
      const orign = { x: c.x, y: shape.height };
      const rad = getRadian(p, orign);
      renderValueLabel(
        ctx,
        Math.round((-rad * 180) / Math.PI),
        { x: shape.width / 2, y: -16 * scale },
        -shape.rotation,
        scale,
        true,
      );
    }

    applyFillStyle(ctx, { color: style.selectionSecondaly });
    ctx.beginPath();
    ctx.arc(p.x, p.y, threshold, 0, TAU);
    ctx.fill();
  });
}
