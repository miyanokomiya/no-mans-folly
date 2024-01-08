import { IVec2, getDistance } from "okageo";
import { OneSidedArrowShape, getHeadControlPoint, getTailControlPoint } from "../shapes/oneSidedArrow";
import { StyleScheme } from "../models";
import { ShapeComposite } from "./shapeComposite";
import { applyFillStyle } from "../utils/fillStyle";
import { TAU } from "../utils/geometry";

const ANCHOR_SIZE = 6;

type AnchorType = "head" | "tail";

export interface ArrowHitResult {
  type: AnchorType;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export function newArrowHandler(option: Option) {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as OneSidedArrowShape;
  const headControlP = getHeadControlPoint(shape);
  const tailControlP = getTailControlPoint(shape);

  function hitTest(p: IVec2, scale = 1): ArrowHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    if (getDistance(headControlP, p) <= threshold) {
      return { type: "head" };
    }
    if (getDistance(tailControlP, p) <= threshold) {
      return { type: "tail" };
    }
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: ArrowHitResult) {
    const threshold = ANCHOR_SIZE * scale;

    if (hitResult?.type === "head") {
      applyFillStyle(ctx, { color: style.selectionSecondaly });
    } else {
      applyFillStyle(ctx, { color: style.selectionPrimary });
    }
    ctx.beginPath();
    ctx.arc(headControlP.x, headControlP.y, threshold, 0, TAU);
    ctx.fill();

    if (hitResult?.type === "tail") {
      applyFillStyle(ctx, { color: style.selectionSecondaly });
    } else {
      applyFillStyle(ctx, { color: style.selectionPrimary });
    }
    ctx.beginPath();
    ctx.arc(tailControlP.x, tailControlP.y, threshold, 0, TAU);
    ctx.fill();
  }

  return {
    hitTest,
    render,
  };
}
export type ArrowHandler = ReturnType<typeof newArrowHandler>;
