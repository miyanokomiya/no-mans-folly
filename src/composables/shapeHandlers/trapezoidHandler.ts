import { IVec2, getDistance, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU, getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { TrapezoidShape } from "../../shapes/polygons/trapezoid";
import { applyLocalSpace } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";

const ANCHOR_SIZE = 6;
const ANCHOR_MARGIN = ANCHOR_SIZE * 3;

type AnchorType = "c0" | "c1";

interface TrapezoidHitResult {
  type: AnchorType;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newTrapezoidHandler = defineShapeHandler<TrapezoidHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as TrapezoidShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  function getAnchors(scale: number) {
    const margin = ANCHOR_MARGIN * scale;
    const control0P = { x: shape.width * shape.c0.x, y: shape.height * shape.c0.y - margin };
    const control1P = { x: shape.width * shape.c1.x, y: shape.height * shape.c1.y - margin };
    return { control0P, control1P };
  }

  function hitTest(p: IVec2, scale = 1): TrapezoidHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const { control0P, control1P } = getAnchors(scale);
    const adjustedP = sub(rotateFn(p, true), shape.p);

    if (getDistance(control0P, adjustedP) <= threshold) {
      return { type: "c0" };
    }
    if (getDistance(control1P, adjustedP) <= threshold) {
      return { type: "c1" };
    }
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: TrapezoidHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    const { control0P, control1P } = getAnchors(scale);
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      (
        [
          [control0P, hitResult?.type === "c0"],
          [control1P, hitResult?.type === "c1"],
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
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, 0);
        ctx.stroke();

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

export function renderMovingTrapezoidAnchor(
  ctx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: TrapezoidShape,
  controlKey: "c0" | "c1",
) {
  const margin = ANCHOR_MARGIN * scale;
  const nextControlP = {
    x: shape.width * shape[controlKey].x,
    y: 0,
  };

  applyLocalSpace(ctx, { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height }, shape.rotation, () => {
    applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: scale });
    ctx.beginPath();
    ctx.moveTo(nextControlP.x, nextControlP.y - margin);
    ctx.lineTo(nextControlP.x, nextControlP.y);
    ctx.stroke();

    applyFillStyle(ctx, { color: style.selectionSecondaly });
    ctx.beginPath();
    ctx.arc(nextControlP.x, nextControlP.y - margin, 3 * scale, 0, TAU);
    ctx.fill();

    applyFillStyle(ctx, { color: style.selectionSecondaly });
    ctx.beginPath();
    ctx.arc(nextControlP.x, nextControlP.y, 6 * scale, 0, TAU);
    ctx.fill();
  });
}
