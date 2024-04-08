import { IVec2, getDistance, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { TAU, getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyLocalSpace, renderOutlinedCircle, renderValueLabel } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { CrossShape } from "../../shapes/polygons/cross";

const ANCHOR_SIZE = 6;

type AnchorType = "crossSize";

interface CrossHitResult {
  type: AnchorType;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newCrossHandler = defineShapeHandler<CrossHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as CrossShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  function getAnchors() {
    const controlSizeP = { x: shape.width / 2 + shape.crossSize / 2, y: shape.height / 2 };
    return { controlSizeP };
  }

  function hitTest(p: IVec2, scale = 1): CrossHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const { controlSizeP } = getAnchors();
    const adjustedP = sub(rotateFn(p, true), shape.p);

    if (getDistance(controlSizeP, adjustedP) <= threshold) {
      return { type: "crossSize" };
    }
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: CrossHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    const { controlSizeP } = getAnchors();
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      applyStrokeStyle(ctx, { color: style.selectionSecondaly, dash: "dot" });
      ctx.beginPath();
      ctx.arc(shape.width / 2, shape.height / 2, shape.crossSize / 2, 0, TAU);
      ctx.stroke();

      if (hitResult) {
        renderOutlinedCircle(ctx, controlSizeP, threshold, style.selectionSecondaly);
      } else {
        renderOutlinedCircle(ctx, controlSizeP, threshold, style.transformAnchor);
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

export function renderMovingCrossAnchor(
  ctx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: CrossShape,
  showLabel = false,
) {
  const threshold = ANCHOR_SIZE * scale;
  const c = { x: shape.width / 2, y: shape.height / 2 };
  const p = { x: c.x + shape.crossSize / 2, y: c.y };

  applyLocalSpace(ctx, { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height }, shape.rotation, () => {
    if (showLabel) {
      renderValueLabel(ctx, shape.crossSize, c, -shape.rotation, scale, true);
    }

    applyStrokeStyle(ctx, { color: style.selectionSecondaly, dash: "dot" });
    ctx.beginPath();
    ctx.arc(shape.width / 2, shape.height / 2, shape.crossSize / 2, 0, TAU);
    ctx.stroke();

    renderOutlinedCircle(ctx, p, threshold, style.selectionSecondaly);
  });
}
