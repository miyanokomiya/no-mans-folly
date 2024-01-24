import { IVec2, add, getDistance, rotate } from "okageo";
import { TwoSidedArrowShape, getHeadControlPoint } from "../shapes/twoSidedArrow";
import { StyleScheme } from "../models";
import { ShapeComposite } from "./shapeComposite";
import { applyFillStyle } from "../utils/fillStyle";
import { TAU, getRadianForDirection4 } from "../utils/geometry";
import { renderArrowUnit } from "../utils/renderer";
import { COLORS } from "../utils/color";
import { getArrowDirection, getArrowHeadPoint, getArrowTailPoint } from "../utils/arrows";

const ANCHOR_SIZE = 6;
const DIRECTION_ANCHOR_SIZE = 10;

type AnchorType = "head" | "direction" | "to" | "from";

export interface ArrowTwoHitResult {
  type: AnchorType;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export function newArrowTwoHandler(option: Option) {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as TwoSidedArrowShape;
  const headControlP = getHeadControlPoint(shape);
  const toControlP = getArrowHeadPoint(shape);
  const fromControlP = getArrowTailPoint(shape);

  function getDirectionAnchor(scale: number) {
    const d = DIRECTION_ANCHOR_SIZE * 2 * scale;
    return add(
      rotate({ x: shape.width + d, y: shape.height + d }, shape.rotation, {
        x: shape.width / 2,
        y: shape.height / 2,
      }),
      shape.p,
    );
  }

  function hitTest(p: IVec2, scale = 1): ArrowTwoHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    if (getDistance(headControlP, p) <= threshold) {
      return { type: "head" };
    }
    if (getDistance(toControlP, p) <= threshold) {
      return { type: "to" };
    }
    if (getDistance(fromControlP, p) <= threshold) {
      return { type: "from" };
    }

    const directionThreshold = DIRECTION_ANCHOR_SIZE * scale;
    if (getDistance(getDirectionAnchor(scale), p) <= directionThreshold) {
      return { type: "direction" };
    }
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: ArrowTwoHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    const directionThreshold = DIRECTION_ANCHOR_SIZE * scale;

    (
      [
        [headControlP, hitResult?.type === "head"],
        [toControlP, hitResult?.type === "to"],
        [fromControlP, hitResult?.type === "from"],
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

    if (hitResult?.type === "direction") {
      applyFillStyle(ctx, { color: style.selectionSecondaly });
    } else {
      applyFillStyle(ctx, { color: style.selectionPrimary });
    }
    const directionAnchor = getDirectionAnchor(scale);
    ctx.beginPath();
    ctx.arc(directionAnchor.x, directionAnchor.y, directionThreshold, 0, TAU);
    ctx.fill();
    applyFillStyle(ctx, { color: COLORS.WHITE });
    renderArrowUnit(
      ctx,
      directionAnchor,
      getRadianForDirection4(getArrowDirection(shape)) + Math.PI / 2,
      directionThreshold * 0.8,
    );
  }

  return {
    hitTest,
    render,
  };
}
export type ArrowTwoHandler = ReturnType<typeof newArrowTwoHandler>;
