import { IVec2, add, applyAffine, getDistance, getRadian } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { BubbleShape, getBeakControls, getBeakSize } from "../../shapes/polygons/bubble";
import { applyLocalSpace, renderOutlinedCircle, renderValueLabel, scaleGlobalAlpha } from "../../utils/renderer";
import { getShapeDetransform } from "../../shapes/rectPolygon";
import { getLocalAbsolutePoint } from "../../shapes/simplePolygon";
import { applyStrokeStyle } from "../../utils/strokeStyle";

const ANCHOR_SIZE = 6;
const ANCHOR_SIZE_L = 10;

type AnchorType = "beakTipC" | "beakOriginC" | "beakSizeC" | "cornerXC" | "cornerYC";

interface BubbleHitResult {
  type: AnchorType;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newBubbleHandler = defineShapeHandler<BubbleHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as BubbleShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const detransform = getShapeDetransform(shape);

  const { tip: beakTipC, origin: beakOriginC, sizeControl: beakSizeC } = getBeakControls(shape);

  function hitTest(p: IVec2, scale = 1): BubbleHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const thresholdL = ANCHOR_SIZE_L * scale;
    const adjustedP = applyAffine(detransform, p);

    if (getDistance(beakSizeC, adjustedP) <= threshold) {
      return { type: "beakSizeC" };
    }
    if (getDistance(beakTipC, adjustedP) <= thresholdL) {
      return { type: "beakTipC" };
    }
    if (getDistance(beakOriginC, adjustedP) <= thresholdL) {
      return { type: "beakOriginC" };
    }

    const [cornerXC, cornerYC] = getLocalCornerControl(shape, scale);
    if (getDistance(cornerXC, adjustedP) <= threshold) {
      return { type: "cornerXC" };
    }
    if (getDistance(cornerYC, adjustedP) <= threshold) {
      return { type: "cornerYC" };
    }
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: BubbleHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    const thresholdL = ANCHOR_SIZE_L * scale;
    const [cornerXC, cornerYC] = getLocalCornerControl(shape, scale);

    scaleGlobalAlpha(ctx, 0.5, () => {
      renderBeakGuidlines(ctx, shape, style, scale);
    });

    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      (
        [
          [beakOriginC, hitResult?.type === "beakOriginC", thresholdL],
          [beakTipC, hitResult?.type === "beakTipC", thresholdL],
          [beakSizeC, hitResult?.type === "beakSizeC"],
          [cornerXC, hitResult?.type === "cornerXC"],
          [cornerYC, hitResult?.type === "cornerYC"],
        ] as const
      ).forEach(([p, highlight, size = threshold]) => {
        if (highlight) {
          renderOutlinedCircle(ctx, p, size, style.selectionSecondaly);
        } else {
          renderOutlinedCircle(ctx, p, size, style.transformAnchor);
        }
      });

      if (hitResult?.type === "beakOriginC" || hitResult?.type === "beakTipC" || hitResult?.type === "beakSizeC") {
        renderRootGuid(ctx, style, scale, beakOriginC, beakTipC, beakSizeC);
      }
    });

    if (hitResult?.type === "cornerXC" || hitResult?.type === "cornerYC") {
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

export function getLocalCornerControl(shape: BubbleShape, scale: number): [IVec2, IVec2] {
  const margin = 16 * scale;
  const cornerXC = add(getLocalAbsolutePoint(shape, { x: shape.cornerC.x, y: 0 }), { x: 0, y: -margin });
  const cornerYC = add(getLocalAbsolutePoint(shape, { x: 0, y: shape.cornerC.y }), { x: -margin, y: 0 });
  return [cornerXC, cornerYC];
}

export function renderBeakGuidlines(
  renderCtx: CanvasRenderingContext2D,
  shape: BubbleShape,
  style: StyleScheme,
  scale: number,
  showRootGuid = false,
) {
  applyStrokeStyle(renderCtx, {
    color: style.selectionSecondaly,
    width: 2 * scale,
  });

  const {
    origin,
    tip,
    sizeControl,
    roots: [root0, root1],
  } = getBeakControls(shape);
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  applyLocalSpace(renderCtx, shapeRect, shape.rotation, () => {
    const radius = getBeakSize(shape);

    if (getDistance(tip, origin) < radius) {
      // Cannot make a beak when its tip is within the arc.
      applyLocalSpace(renderCtx, shapeRect, shape.rotation, () => {
        renderCtx.beginPath();
        renderCtx.arc(origin.x, origin.y, radius, 0, TAU);
        renderCtx.stroke();
      });
    } else {
      const size0Radian = getRadian(root0, origin);
      const size1Radian = getRadian(root1, origin);
      renderCtx.beginPath();
      renderCtx.moveTo(tip.x, tip.y);
      renderCtx.lineTo(root0.x, root0.y);
      renderCtx.arc(origin.x, origin.y, radius, size0Radian, size1Radian, true);
      renderCtx.closePath();
      renderCtx.stroke();
    }

    if (showRootGuid) {
      renderRootGuid(renderCtx, style, scale, origin, tip, sizeControl);
    }
  });
}

function renderRootGuid(
  renderCtx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  origin: IVec2,
  tip: IVec2,
  sizeControl: IVec2,
) {
  applyFillStyle(renderCtx, {
    color: style.selectionSecondaly,
  });
  applyStrokeStyle(renderCtx, {
    color: style.selectionSecondaly,
    width: 2 * scale,
    dash: "short",
  });
  renderCtx.beginPath();
  renderCtx.moveTo(sizeControl.x, sizeControl.y);
  renderCtx.lineTo(origin.x, origin.y);
  renderCtx.lineTo(tip.x, tip.y);
  renderCtx.stroke();

  [origin, tip, sizeControl].forEach((p) => {
    renderCtx.beginPath();
    renderCtx.arc(p.x, p.y, 4 * scale, 0, TAU, true);
    renderCtx.fill();
  });
}

export function renderCornerGuidlines(
  renderCtx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: BubbleShape,
  showLabel = false,
) {
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  applyLocalSpace(renderCtx, shapeRect, shape.rotation, () => {
    const [cornerXC, cornerYC] = getLocalCornerControl(shape, scale);

    if (showLabel) {
      const margin = 20 * scale;
      renderValueLabel(
        renderCtx,
        `${Math.round(shape.cornerC.x * 200)}%`,
        { x: 0, y: -margin },
        -shape.rotation,
        scale,
        true,
      );
      renderValueLabel(
        renderCtx,
        `${Math.round(shape.cornerC.y * 200)}%`,
        { x: -margin, y: 0 },
        -shape.rotation,
        scale,
        true,
      );
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
