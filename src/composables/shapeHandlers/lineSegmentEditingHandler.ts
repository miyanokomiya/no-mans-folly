import { ISegment } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyPath, renderOutlinedCircle } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { getDistance } from "okageo";

const ANCHOR_THRESHOLD = 6;

interface HitResult {
  type: "switch-origin";
}

interface Option {
  segment: ISegment;
  originIndex: 0 | 1;
}

export const newLineSegmentEditingHandler = defineShapeHandler<HitResult, Option>((option) => {
  const segment = option.segment;
  const [origin, other] = option.originIndex === 0 ? segment : [segment[1], segment[0]];

  return {
    hitTest(p, scale) {
      const threshold = ANCHOR_THRESHOLD * scale;
      if (getDistance(p, other) <= threshold) {
        return { type: "switch-origin" };
      }
      return undefined;
    },
    render(ctx, style, scale, hitResult) {
      applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
      ctx.beginPath();
      applyPath(ctx, segment);
      ctx.stroke();

      const threshold = ANCHOR_THRESHOLD * scale;
      renderOutlinedCircle(ctx, origin, threshold, style.selectionPrimary);
      renderOutlinedCircle(
        ctx,
        other,
        threshold,
        hitResult?.type === "switch-origin" ? style.selectionSecondaly : style.transformAnchor,
      );
    },
    isSameHitResult(a, b) {
      return a?.type === b?.type;
    },
  };
});
export type LineSegmentEditingHandler = ReturnType<typeof newLineSegmentEditingHandler>;
