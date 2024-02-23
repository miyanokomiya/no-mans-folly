import { IVec2, applyAffine, getDistance } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { CylinderShape } from "../../shapes/polygons/cylinder";
import { applyLocalSpace } from "../../utils/renderer";
import { getShapeDetransform } from "../../shapes/simplePolygon";

const ANCHOR_SIZE = 6;

type AnchorType = "c0" | "top" | "bottom";

interface CylinderHitResult {
  type: AnchorType;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newCylinderHandler = defineShapeHandler<CylinderHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as CylinderShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const detransform = getShapeDetransform(shape);

  const control0P = { x: shape.width * shape.c0.x, y: shape.height * shape.c0.y };
  const topP = { x: shape.width / 2, y: 0 };
  const bottomP = { x: shape.width / 2, y: shape.height };

  function hitTest(p: IVec2, scale = 1): CylinderHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const adjustedP = applyAffine(detransform, p);

    if (getDistance(control0P, adjustedP) <= threshold) {
      return { type: "c0" };
    }
    if (getDistance(topP, adjustedP) <= threshold) {
      return { type: "top" };
    }
    if (getDistance(bottomP, adjustedP) <= threshold) {
      return { type: "bottom" };
    }
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: CylinderHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      (
        [
          [control0P, hitResult?.type === "c0"],
          [topP, hitResult?.type === "top"],
          [bottomP, hitResult?.type === "bottom"],
        ] as const
      ).forEach(([p, highlight]) => {
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

export function renderMovingCylinderAnchor(
  ctx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: CylinderShape,
) {
  const nextControlP = {
    x: shape.width * shape.c0.x,
    y: shape.height * shape.c0.y,
  };

  applyLocalSpace(ctx, { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height }, shape.rotation, () => {
    applyFillStyle(ctx, { color: style.selectionSecondaly });
    applyFillStyle(ctx, { color: style.selectionSecondaly });
    ctx.beginPath();
    ctx.arc(nextControlP.x, nextControlP.y, 6 * scale, 0, TAU);
    ctx.fill();
  });
}
