import { add, IVec2 } from "okageo";
import { defineShapeHandler } from "./shapeHandlers/core";
import { SmartBranchHitResult } from "./smartBranchHandler";
import { renderRoundedSegment } from "../utils/renderer";
import { ISegment, isPointCloseToSegment } from "../utils/geometry";
import { COLORS } from "../utils/color";
import { Direction4, StyleScheme } from "../models";
import { CanvasCTX } from "../utils/types";

const ANCHOR_SIZE = 4;
const ANCHOR_SEG_SIZE = 60;

export interface SmartBranchSettingHitResult {
  type: "child-margin";
}

interface Option {
  smartBranchHitResult: SmartBranchHitResult;
}

export const newSmartBranchSettingHandler = defineShapeHandler<SmartBranchSettingHitResult, Option>((option) => {
  const [, previewLine] = option.smartBranchHitResult.previewShapes;

  function getChildMarginAnchorLocal(scale: number): ISegment {
    return getChildMarginAnchor(previewLine.q, option.smartBranchHitResult.index, scale);
  }

  return {
    hitTest(p, scale) {
      const threshold = ANCHOR_SIZE * scale;
      const childMarginAnchor = getChildMarginAnchorLocal(scale);
      if (isPointCloseToSegment(childMarginAnchor, p, threshold)) {
        return { type: "child-margin" };
      }
    },
    render(ctx, style, scale, hitResult) {
      const threshold = 2 * ANCHOR_SIZE * scale;
      renderRoundedSegment(
        ctx,
        [getChildMarginAnchorLocal(scale)],
        threshold,
        hitResult?.type === "child-margin" ? style.selectionSecondaly : style.selectionPrimary,
        COLORS.WHITE,
      );
    },
    isSameHitResult(a, b) {
      return a?.type === b?.type;
    },
  };
});
export type SmartBranchSettingHandler = ReturnType<typeof newSmartBranchSettingHandler>;

export function renderSmartBranchChildMarginAnchor(
  ctx: CanvasCTX,
  style: StyleScheme,
  scale: number,
  p: IVec2,
  branchIndex: Direction4,
  highlight = false,
) {
  const threshold = 2 * ANCHOR_SIZE * scale;
  renderRoundedSegment(
    ctx,
    [getChildMarginAnchor(p, branchIndex, scale)],
    threshold,
    highlight ? style.selectionSecondaly : style.selectionPrimary,
    COLORS.WHITE,
  );
}

function getChildMarginAnchor(p: IVec2, branchIndex: Direction4, scale: number): ISegment {
  const segSize = ANCHOR_SEG_SIZE * scale;
  return branchIndex % 2 === 0
    ? [add(p, { x: -segSize / 2, y: 0 }), add(p, { x: segSize / 2, y: 0 })]
    : [add(p, { x: 0, y: -segSize / 2 }), add(p, { x: 0, y: segSize / 2 })];
}
