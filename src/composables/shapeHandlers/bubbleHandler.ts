import { IVec2, add, applyAffine, getDistance, getRadian } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { BubbleShape, getBeakControls, getBeakSize } from "../../shapes/polygons/bubble";
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

  const { tip: beakTipC, origin: beakOriginC, roots: beakRoots } = getBeakControls(shape);
  const beakSizeC = beakRoots[0];

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
  const controls = getBeakControls(shape);
  const transfrom = getShapeTransform(shape);
  const radius = getBeakSize(shape);

  const origin = applyAffine(transfrom, controls.origin);
  const tip = applyAffine(transfrom, controls.tip);
  const root0 = applyAffine(transfrom, controls.roots[0]);
  const root1 = applyAffine(transfrom, controls.roots[1]);
  const size0Radian = getRadian(root0, origin);
  const size1Radian = getRadian(root1, origin);

  applyStrokeStyle(renderCtx, {
    color: style.selectionSecondaly,
    width: 2 * scale,
  });

  if (getDistance(tip, origin) < radius) {
    // Cannot make a beak when its tip is within the arc.
    renderCtx.beginPath();
    renderCtx.arc(origin.x, origin.y, radius, 0, TAU);
    renderCtx.stroke();
    return;
  }

  renderCtx.beginPath();
  renderCtx.moveTo(tip.x, tip.y);
  renderCtx.lineTo(root0.x, root0.y);
  renderCtx.arc(origin.x, origin.y, radius, size0Radian, size1Radian, true);
  renderCtx.closePath();
  renderCtx.stroke();

  if (showRootGuid) {
    applyFillStyle(renderCtx, {
      color: style.selectionSecondaly,
    });
    applyStrokeStyle(renderCtx, {
      color: style.selectionSecondaly,
      width: 2 * scale,
      dash: "short",
    });
    renderCtx.beginPath();
    renderCtx.moveTo(origin.x, origin.y);
    renderCtx.lineTo(root0.x, root0.y);
    renderCtx.stroke();

    renderCtx.beginPath();
    renderCtx.arc(origin.x, origin.y, 4 * scale, 0, TAU, true);
    renderCtx.fill();
  }
}
