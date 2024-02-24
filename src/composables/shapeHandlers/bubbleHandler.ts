import { IVec2, add, applyAffine, getDistance, getRadian, rotate } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { BubbleShape, getBeakSize } from "../../shapes/polygons/bubble";
import { applyLocalSpace } from "../../utils/renderer";
import { getLocalAbsolutePoint, getShapeDetransform } from "../../shapes/simplePolygon";

const ANCHOR_SIZE = 6;

type AnchorType = "beakTipC" | "beakSizeC" | "cornerXC" | "cornerYC";

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

  const { tip: beakTipC, size: beakSizeC } = getLocalBeakControls(shape);

  function hitTest(p: IVec2, scale = 1): BubbleHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const adjustedP = applyAffine(detransform, p);

    if (getDistance(beakTipC, adjustedP) <= threshold) {
      return { type: "beakTipC" };
    }
    if (getDistance(beakSizeC, adjustedP) <= threshold) {
      return { type: "beakSizeC" };
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
    const [cornerXC, cornerYC] = getLocalCornerControl(shape, scale);
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      (
        [
          [beakTipC, hitResult?.type === "beakTipC"],
          [beakSizeC, hitResult?.type === "beakSizeC"],
          [cornerXC, hitResult?.type === "cornerXC"],
          [cornerYC, hitResult?.type === "cornerYC"],
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

export function getLocalBeakControls(shape: BubbleShape): { tip: IVec2; size: IVec2 } {
  const localCenter = getLocalAbsolutePoint(shape, { x: 0.5, y: 0.5 });
  const beakTipC = getLocalAbsolutePoint(shape, shape.beakTipC);
  const beakRad = getRadian(beakTipC, localCenter);
  return {
    tip: beakTipC,
    size: rotate({ x: shape.width / 2 + getBeakSize(shape), y: shape.height / 2 }, beakRad - Math.PI / 2, localCenter),
  };
}

export function getLocalCornerControl(shape: BubbleShape, scale: number): [IVec2, IVec2] {
  const margin = 16 * scale;
  const cornerXC = add(getLocalAbsolutePoint(shape, { x: shape.cornerC.x, y: 0 }), { x: 0, y: -margin });
  const cornerYC = add(getLocalAbsolutePoint(shape, { x: 0, y: shape.cornerC.y }), { x: -margin, y: 0 });
  return [cornerXC, cornerYC];
}
