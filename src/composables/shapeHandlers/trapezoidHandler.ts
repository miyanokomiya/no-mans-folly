import { IVec2, getDistance, getRadian, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU, getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { TrapezoidShape } from "../../shapes/polygons/trapezoid";
import { applyLocalSpace, renderValueLabel } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";

const ANCHOR_SIZE = 6;

type AnchorType = "c0" | "c1" | "left" | "right";

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

  function getAnchors() {
    const control0P = { x: shape.width * shape.c0.x, y: shape.height * shape.c0.y };
    const control1P = { x: shape.width * shape.c1.x, y: shape.height * shape.c1.y };
    const controlLeftP = { x: 0, y: shape.height / 2 };
    const controlRightP = { x: shape.width, y: shape.height / 2 };
    return { control0P, control1P, controlLeftP, controlRightP };
  }

  function hitTest(p: IVec2, scale = 1): TrapezoidHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const { control0P, control1P, controlLeftP, controlRightP } = getAnchors();
    const adjustedP = sub(rotateFn(p, true), shape.p);

    if (getDistance(control1P, adjustedP) <= threshold) {
      return { type: "c1" };
    }
    if (getDistance(control0P, adjustedP) <= threshold) {
      return { type: "c0" };
    }
    if (getDistance(controlLeftP, adjustedP) <= threshold) {
      return { type: "left" };
    }
    if (getDistance(controlRightP, adjustedP) <= threshold) {
      return { type: "right" };
    }
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: TrapezoidHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    const { control0P, control1P, controlLeftP, controlRightP } = getAnchors();
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      (
        [
          [control0P, hitResult?.type === "c0"],
          [control1P, hitResult?.type === "c1"],
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

export function renderMovingTrapezoidAnchor(
  ctx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: TrapezoidShape,
  controlKey: "c0" | "c1",
  showLabel = false,
) {
  const nextControlP = {
    x: shape.width * shape[controlKey].x,
    y: 0,
  };

  applyLocalSpace(ctx, { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height }, shape.rotation, () => {
    if (showLabel) {
      if (controlKey === "c0") {
        const origin = { x: 0, y: shape.height };
        const rad = getRadian(nextControlP, origin);
        const angle = Math.round((-rad * 180) / Math.PI);
        renderValueLabel(ctx, angle, origin, -shape.rotation, scale);
      } else {
        const origin = { x: shape.width, y: shape.height };
        const rad = getRadian(nextControlP, origin);
        const angle = 180 - Math.round((-rad * 180) / Math.PI);
        renderValueLabel(ctx, angle, origin, -shape.rotation, scale);
      }
    }

    applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 2 * scale, dash: "dot" });
    ctx.beginPath();
    ctx.rect(0, 0, shape.width, shape.height);
    ctx.stroke();

    applyFillStyle(ctx, { color: style.selectionSecondaly });
    ctx.beginPath();
    ctx.arc(nextControlP.x, nextControlP.y, ANCHOR_SIZE * scale, 0, TAU);
    ctx.fill();
  });
}
