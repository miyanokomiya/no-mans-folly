import { IVec2, getDistance, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU, getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { DiagonalCrossShape } from "../../shapes/polygons/diagonalCross";
import { applyLocalSpace, renderValueLabel } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";

const ANCHOR_SIZE = 6;

type AnchorType = "crossSize";

interface DiagonalCrossHitResult {
  type: AnchorType;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newDiagonalCrossHandler = defineShapeHandler<DiagonalCrossHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as DiagonalCrossShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  function getAnchors() {
    const controlSizeP = { x: shape.width / 2 + shape.crossSize / 2, y: shape.height / 2 };
    return { controlSizeP };
  }

  function hitTest(p: IVec2, scale = 1): DiagonalCrossHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const { controlSizeP } = getAnchors();
    const adjustedP = sub(rotateFn(p, true), shape.p);

    if (getDistance(controlSizeP, adjustedP) <= threshold) {
      return { type: "crossSize" };
    }
  }

  function render(
    ctx: CanvasRenderingContext2D,
    style: StyleScheme,
    scale: number,
    hitResult?: DiagonalCrossHitResult,
  ) {
    const threshold = ANCHOR_SIZE * scale;
    const { controlSizeP } = getAnchors();
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      ([[controlSizeP, hitResult?.type === "crossSize"]] as const).forEach(([p, highlight]) => {
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, dash: "dot" });
        ctx.beginPath();
        ctx.arc(shape.width / 2, shape.height / 2, shape.crossSize / 2, 0, TAU);
        ctx.stroke();

        if (highlight) {
          applyFillStyle(ctx, { color: style.selectionSecondaly });
        } else {
          applyFillStyle(ctx, { color: style.selectionPrimary });
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

export function renderMovingDiagonalCrossAnchor(
  ctx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: DiagonalCrossShape,
  showLabel = false,
) {
  const threshold = ANCHOR_SIZE * scale;
  const c = { x: shape.width / 2, y: shape.height / 2 };
  const p = { x: c.x + shape.crossSize / 2, y: c.y };

  applyLocalSpace(ctx, { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height }, shape.rotation, () => {
    if (showLabel) {
      renderValueLabel(ctx, shape.crossSize, c, -shape.rotation, scale);
    }

    applyStrokeStyle(ctx, { color: style.selectionSecondaly, dash: "dot" });
    ctx.beginPath();
    ctx.arc(shape.width / 2, shape.height / 2, shape.crossSize / 2, 0, TAU);
    ctx.stroke();

    applyFillStyle(ctx, { color: style.selectionSecondaly });
    ctx.beginPath();
    ctx.arc(p.x, p.y, threshold, 0, TAU);
    ctx.fill();
  });
}
