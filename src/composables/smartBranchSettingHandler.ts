import { add } from "okageo";
import { defineShapeHandler } from "./shapeHandlers/core";
import { SmartBranchHitResult } from "./smartBranchHandler";
import { renderRoundedSegment } from "../utils/renderer";
import { ISegment, isPointCloseToSegment } from "../utils/geometry";
import { COLORS } from "../utils/color";

const ANCHOR_SIZE = 8;
const ANCHOR_SEG_SIZE = 60;

export interface SmartBranchSettingHitResult {
  type: "child-margin";
}

interface Option {
  smartBranchHitResult: SmartBranchHitResult;
}

export const newSmartBranchSettingHandler = defineShapeHandler<SmartBranchSettingHitResult, Option>((option) => {
  const [, previewLine] = option.smartBranchHitResult.previewShapes;

  function getChildMarginAnchor(scale: number): ISegment {
    const segSize = ANCHOR_SEG_SIZE * scale;
    return option.smartBranchHitResult.index % 2 === 0
      ? [add(previewLine.q, { x: -segSize / 2, y: 0 }), add(previewLine.q, { x: segSize / 2, y: 0 })]
      : [add(previewLine.q, { x: 0, y: -segSize / 2 }), add(previewLine.q, { x: 0, y: segSize / 2 })];
  }

  return {
    hitTest(p, scale) {
      const threshold = ANCHOR_SIZE * scale;
      const childMarginAnchor = getChildMarginAnchor(scale);
      if (isPointCloseToSegment(childMarginAnchor, p, threshold)) {
        return { type: "child-margin" };
      }
    },
    render(ctx, style, scale, hitResult) {
      const threshold = ANCHOR_SIZE * scale;
      renderRoundedSegment(
        ctx,
        [getChildMarginAnchor(scale)],
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
