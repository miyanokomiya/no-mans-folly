import { IVec2, add, applyAffine, getDistance, getRadian, getSymmetry, rotate } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { BubbleShape, getBeakSize } from "../../shapes/polygons/bubble";
import { applyLocalSpace } from "../../utils/renderer";
import { getLocalAbsolutePoint, getShapeDetransform, getShapeTransform } from "../../shapes/simplePolygon";
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

  const { tip: beakTipC, origin: beakOriginC, size: beakSizeC } = getLocalBeakControls(shape);

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
          applyFillStyle(ctx, { color: style.selectionSecondaly });
        } else {
          applyFillStyle(ctx, { color: style.selectionPrimary });
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, TAU);
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

export function renderMovingBubbleAnchor(
  ctx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: BubbleShape,
) {
  const nextControlP = getLocalAbsolutePoint(shape, shape.beakTipC);
  applyLocalSpace(ctx, { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height }, shape.rotation, () => {
    applyFillStyle(ctx, { color: style.selectionSecondaly });
    applyFillStyle(ctx, { color: style.selectionSecondaly });
    ctx.beginPath();
    ctx.arc(nextControlP.x, nextControlP.y, 6 * scale, 0, TAU);
    ctx.fill();
  });
}

export function getLocalBeakControls(shape: BubbleShape): { tip: IVec2; origin: IVec2; size: IVec2 } {
  const beakOrigin = getLocalAbsolutePoint(shape, shape.beakOriginC);
  const beakTipC = getLocalAbsolutePoint(shape, shape.beakTipC);
  const beakRad = getRadian(beakTipC, beakOrigin);
  return {
    tip: beakTipC,
    origin: beakOrigin,
    size: rotate({ x: beakOrigin.x + getBeakSize(shape), y: beakOrigin.y }, beakRad - Math.PI / 2, beakOrigin),
  };
}

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
) {
  applyStrokeStyle(renderCtx, {
    color: style.selectionSecondaly,
    width: 2 * scale,
  });

  const controls = getLocalBeakControls(shape);
  const transfrom = getShapeTransform(shape);
  const radius = getBeakSize(shape);

  const origin = applyAffine(transfrom, controls.origin);
  const tip = applyAffine(transfrom, controls.tip);
  const size0 = applyAffine(transfrom, controls.size);
  const size1 = getSymmetry(size0, origin);
  const size0Radian = getRadian(size0, origin);
  const size1Radian = getRadian(size1, origin);

  renderCtx.beginPath();
  renderCtx.moveTo(tip.x, tip.y);
  renderCtx.lineTo(size0.x, size0.y);
  renderCtx.arc(origin.x, origin.y, radius, size0Radian, size1Radian, true);
  renderCtx.closePath();
  renderCtx.stroke();
}
