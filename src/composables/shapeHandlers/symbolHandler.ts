import { IVec2, getDistance, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyLocalSpace, renderArrowUnit, renderOutlinedCircle } from "../../utils/renderer";
import { applyFillStyle } from "../../utils/fillStyle";
import { COLORS } from "../../utils/color";
import { CanvasCTX } from "../../utils/types";
import { SymbolShape } from "../../shapes/symbol";

const ANCHOR_SIZE_OPEN = 10;

type HitAnchor = [type: "open", IVec2];

export interface SymbolHitResult {
  type: HitAnchor[0];
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newSymbolHandler = defineShapeHandler<SymbolHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as SymbolShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));
  const canJump = shape.src.some((id) => shapeComposite.shapeMap[id]);

  function getOpenAnchor(scale: number): HitAnchor {
    const y = shapeRect.height + ANCHOR_SIZE_OPEN * 1.2 * scale;
    return ["open", { x: ANCHOR_SIZE_OPEN * scale, y }];
  }

  function hitTest(p: IVec2, scale = 1): SymbolHitResult | undefined {
    if (!canJump) return;

    const adjustedP = sub(rotateFn(p, true), shape.p);
    const thresholdJump = ANCHOR_SIZE_OPEN * scale;
    const openAnchor = getOpenAnchor(scale);
    if (getDistance(openAnchor[1], adjustedP) <= thresholdJump) {
      return { type: openAnchor[0] };
    }
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: SymbolHitResult) {
    if (!canJump) return;

    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      const thresholdJump = ANCHOR_SIZE_OPEN * scale;
      const openAnchor = getOpenAnchor(scale);
      renderOutlinedCircle(
        ctx,
        openAnchor[1],
        thresholdJump,
        hitResult?.type === openAnchor[0] ? style.selectionSecondaly : style.selectionPrimary,
      );
      applyFillStyle(ctx, { color: COLORS.WHITE });
      renderArrowUnit(ctx, openAnchor[1], 0, thresholdJump * 0.6);
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
export type SymbolHandler = ReturnType<typeof newSymbolHandler>;
