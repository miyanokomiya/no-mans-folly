import { IVec2, getDistance, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyLocalSpace, renderArrowUnit, renderOutlinedCircle } from "../../utils/renderer";
import { FrameShape } from "../../shapes/frame";
import { getAllFrameShapes, getFrameRect } from "../frame";
import { applyFillStyle } from "../../utils/fillStyle";
import { COLORS } from "../../utils/color";

export const ANCHOR_SIZE = 6;
export const ANCHOR_SIZE_JUMP = 10;
export const ANCHOR_MARGIN = 16;

type HitAnchor = [type: "jump-back" | "jump-next", IVec2];

export interface FrameHitResult {
  type: HitAnchor[0];
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newFrameHandler = defineShapeHandler<FrameHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as FrameShape;
  const shapeRect = getFrameRect(shape);
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));
  const frames = getAllFrameShapes(shapeComposite);
  const targetIndex = frames.findIndex((f) => f.id === shape.id);
  const canJumpBack = 0 < targetIndex;
  const canJumpNext = targetIndex < frames.length - 1;

  function getJumpAnchors(scale: number): HitAnchor[] {
    const y = shapeRect.height + ANCHOR_SIZE_JUMP * 1.2 * scale;
    return [
      ["jump-back", { x: ANCHOR_SIZE_JUMP * scale, y }],
      ["jump-next", { x: ANCHOR_SIZE_JUMP * 3.5 * scale, y }],
    ];
  }

  function hitTest(p: IVec2, scale = 1): FrameHitResult | undefined {
    const adjustedP = sub(rotateFn(p, true), shape.p);

    const thresholdJump = ANCHOR_SIZE_JUMP * scale;
    const hit = getJumpAnchors(scale).find((a) => getDistance(a[1], adjustedP) <= thresholdJump);
    if (hit) {
      return { type: hit[0] };
    }
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: FrameHitResult) {
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      const thresholdJump = ANCHOR_SIZE_JUMP * scale;
      const [anchorBack, anchorNext] = getJumpAnchors(scale);

      if (!canJumpBack) {
        renderOutlinedCircle(ctx, anchorBack[1], thresholdJump, COLORS.GRAY_1);
      } else if (hitResult?.type === anchorBack[0]) {
        renderOutlinedCircle(ctx, anchorBack[1], thresholdJump, style.selectionSecondaly);
      } else {
        renderOutlinedCircle(ctx, anchorBack[1], thresholdJump, style.selectionPrimary);
      }

      if (!canJumpNext) {
        renderOutlinedCircle(ctx, anchorNext[1], thresholdJump, COLORS.GRAY_1);
      } else if (hitResult?.type === anchorNext[0]) {
        renderOutlinedCircle(ctx, anchorNext[1], thresholdJump, style.selectionSecondaly);
      } else {
        renderOutlinedCircle(ctx, anchorNext[1], thresholdJump, style.selectionPrimary);
      }

      applyFillStyle(ctx, { color: COLORS.WHITE });
      renderArrowUnit(ctx, anchorBack[1], Math.PI, thresholdJump * 0.6);
      renderArrowUnit(ctx, anchorNext[1], 0, thresholdJump * 0.6);
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
export type FrameHandler = ReturnType<typeof newFrameHandler>;
