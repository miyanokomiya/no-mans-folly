import { ISegment } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyPath, renderOutlinedCircle, renderValueLabel } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { add, getDistance, getRadian, multi, rotate } from "okageo";

const ANCHOR_THRESHOLD = 6;

interface HitResult {
  type: "switch-origin";
}

interface Option {
  segment: ISegment;
  originRadian: number;
}

export const newLineSegmentEditingHandler = defineShapeHandler<HitResult, Option>((option) => {
  const segment = option.segment;
  const [origin, other] = segment;
  const radian = getRadian(other, origin);
  const totalSize = getDistance(origin, other);
  const originV = rotate({ x: 1, y: 0 }, option.originRadian);

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

      {
        const originSeg = [add(origin, multi(originV, totalSize * 0.7)), origin];
        applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 2 * scale });
        ctx.beginPath();
        applyPath(ctx, originSeg);
        ctx.stroke();

        applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 2 * scale });
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, totalSize * 0.5, option.originRadian, radian);
        ctx.stroke();
      }

      {
        const normalV = rotate({ x: 1, y: 0 }, radian + Math.PI / 2);
        const long = multi(normalV, 30 * scale);
        const middle = multi(normalV, 21 * scale);
        const short = multi(normalV, 15 * scale);
        const step = scale < 0.1 ? 1 : scale < 4 ? 10 : 100;
        const longStep = 10;
        const stepV = rotate({ x: 1, y: 0 }, radian);
        const segs = [...Array(Math.floor(totalSize / step) + 10)].map((_, i) => {
          const p = add(origin, multi(stepV, step * i));
          return [p, add(p, i % longStep === 0 ? long : i % (longStep / 2) === 0 ? middle : short)];
        });
        applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 1 * scale });
        ctx.beginPath();
        segs.forEach((seg) => {
          applyPath(ctx, seg);
        });
        ctx.stroke();
        segs.forEach((seg, i) => {
          if (i % longStep !== 0) return;
          renderValueLabel(ctx, step * i, seg[1], 0, scale, true);
        });
      }

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
