import { IVec2, applyAffine, getDistance } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyLocalSpace, renderValueLabel } from "../../utils/renderer";
import { getShapeDetransform } from "../../shapes/simplePolygon";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { RoundedRectangleShape } from "../../shapes/polygons/roundedRectangle";

const ANCHOR_SIZE = 6;

type AnchorType = "rx" | "ry";

interface RoundedRectangleHitResult {
  type: AnchorType;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newRoundedRectangleHandler = defineShapeHandler<RoundedRectangleHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as RoundedRectangleShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const detransform = getShapeDetransform(shape);

  function hitTest(p: IVec2, scale = 1): RoundedRectangleHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const adjustedP = applyAffine(detransform, p);

    const [cornerXC, cornerYC] = getLocalCornerControl(shape, scale);
    if (getDistance(cornerXC, adjustedP) <= threshold) {
      return { type: "rx" };
    }
    if (getDistance(cornerYC, adjustedP) <= threshold) {
      return { type: "ry" };
    }
  }

  function render(
    ctx: CanvasRenderingContext2D,
    style: StyleScheme,
    scale: number,
    hitResult?: RoundedRectangleHitResult,
  ) {
    const threshold = ANCHOR_SIZE * scale;
    const [cornerXC, cornerYC] = getLocalCornerControl(shape, scale);
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      (
        [
          [cornerXC, hitResult?.type === "rx"],
          [cornerYC, hitResult?.type === "ry"],
        ] as const
      ).forEach(([p, highlight, size = threshold]) => {
        if (highlight) {
          applyFillStyle(ctx, { color: style.selectionSecondaly });
        } else {
          applyFillStyle(ctx, { color: style.transformAnchor });
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, TAU);
        ctx.fill();
      });
    });

    if (hitResult?.type === "rx" || hitResult?.type === "ry") {
      renderCornerGuidlines(ctx, style, scale, shape);
    }
  }

  return {
    hitTest,
    render,
    isSameHitResult: (a, b) => {
      return a?.type === b?.type;
    },
  };
});

export function getLocalCornerControl(shape: RoundedRectangleShape, scale: number): [IVec2, IVec2] {
  const margin = 16 * scale;
  return [
    { x: shape.rx ?? 0, y: -margin },
    { x: -margin, y: shape.ry ?? 0 },
  ];
}

export function renderCornerGuidlines(
  renderCtx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: RoundedRectangleShape,
  showLabel = false,
) {
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  applyLocalSpace(renderCtx, shapeRect, shape.rotation, () => {
    const [cornerXC, cornerYC] = getLocalCornerControl(shape, scale);

    if (showLabel) {
      const margin = 20 * scale;
      renderValueLabel(renderCtx, shape.rx ?? 0, { x: 0, y: -margin }, -shape.rotation, scale, true);
      renderValueLabel(renderCtx, shape.ry ?? 0, { x: -margin, y: 0 }, -shape.rotation, scale, true);
    }

    applyStrokeStyle(renderCtx, {
      color: style.selectionSecondaly,
      width: 2 * scale,
      dash: "short",
    });

    renderCtx.beginPath();
    renderCtx.rect(0, 0, cornerXC.x, cornerYC.y);
    renderCtx.stroke();
  });
}
