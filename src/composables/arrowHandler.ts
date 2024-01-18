import { IVec2, add, getDistance, getRadian, isSame, rotate, sub } from "okageo";
import {
  OneSidedArrowShape,
  getArrowDirection,
  getArrowHeadLength,
  getArrowHeadPoint,
  getArrowTailPoint,
  getHeadControlPoint,
  getTailControlPoint,
} from "../shapes/oneSidedArrow";
import { StyleScheme } from "../models";
import { ShapeComposite } from "./shapeComposite";
import { applyFillStyle } from "../utils/fillStyle";
import { TAU, getRadianForDirection4 } from "../utils/geometry";
import { renderArrowUnit } from "../utils/renderer";
import { COLORS } from "../utils/color";

const ANCHOR_SIZE = 6;
const DIRECTION_ANCHOR_SIZE = 10;

type AnchorType = "head" | "tail" | "direction" | "to";

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
  const toControlP = getArrowHeadPoint(shape);

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

  function hitTest(p: IVec2, scale = 1): ArrowHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    if (getDistance(headControlP, p) <= threshold) {
      return { type: "head" };
    }
    if (getDistance(tailControlP, p) <= threshold) {
      return { type: "tail" };
    }
    if (getDistance(toControlP, p) <= threshold) {
      return { type: "to" };
    }

    const directionThreshold = DIRECTION_ANCHOR_SIZE * scale;
    if (getDistance(getDirectionAnchor(scale), p) <= directionThreshold) {
      return { type: "direction" };
    }
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: ArrowHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    const directionThreshold = DIRECTION_ANCHOR_SIZE * scale;

    (
      [
        [headControlP, hitResult?.type === "head"],
        [tailControlP, hitResult?.type === "tail"],
        [toControlP, hitResult?.type === "to"],
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
export type ArrowHandler = ReturnType<typeof newArrowHandler>;

export function patchToMoveHead(src: OneSidedArrowShape, p: IVec2): Partial<OneSidedArrowShape> {
  const currentHeadP = getArrowHeadPoint(src);
  const tailP = getArrowTailPoint(src);
  const currentDistance = getDistance(currentHeadP, tailP);
  const nextDistance = Math.max(getDistance(p, tailP), getArrowHeadLength(src));
  const rate = nextDistance / currentDistance;

  const patch = {
    headControl: { x: src.headControl.x / rate, y: src.headControl.y },
  } as Partial<OneSidedArrowShape>;
  switch (src.direction) {
    case 0:
      patch.rotation = getRadian(p, tailP) + Math.PI / 2;
      patch.height = nextDistance;
      break;
    case 2:
      patch.rotation = getRadian(p, tailP) - Math.PI / 2;
      patch.height = nextDistance;
      break;
    case 3:
      patch.rotation = getRadian(p, tailP) - Math.PI;
      patch.width = nextDistance;
      break;
    default:
      patch.rotation = getRadian(p, tailP);
      patch.width = nextDistance;
      break;
  }

  if (patch.rotation === src.rotation) {
    delete patch.rotation;
  }

  const tmpTailP = getArrowTailPoint({ ...src, ...patch });
  if (!isSame(tailP, tmpTailP)) {
    const tailAdjustment = sub(tailP, tmpTailP);
    patch.p = add(src.p, tailAdjustment);
  }
  return patch;
}
