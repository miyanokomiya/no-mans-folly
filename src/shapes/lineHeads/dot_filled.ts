import { applyAffine } from "okageo";
import { LineHead } from "../../models";
import { applyPath } from "../../utils/renderer";
import { LineHeadStruct } from "./core";

export const LineHeadDotFilled: LineHeadStruct<LineHead> = {
  label: "Dot Filled",
  create(arg = {}) {
    return {
      ...arg,
      type: "dot_filled",
    };
  },
  render(ctx, _head, transform, lineWidth) {
    const radius = 6 + lineWidth / 2;
    ctx.beginPath();
    ctx.arc(transform[4], transform[5], radius, 0, Math.PI * 2, true);

    const tmp = ctx.fillStyle;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.fillStyle = tmp;
    ctx.stroke();
  },
  clip(region, _head, transform, lineWidth) {
    const radius = 6 + lineWidth / 2;

    // "arc" doesn't work well when other clipping are exists
    applyPath(
      region,
      [
        { x: 0, y: -radius },
        { x: -radius, y: -radius },
        { x: -radius, y: radius },
        { x: 0, y: radius },
      ].map((p) => applyAffine(transform, p)),
      true
    );
  },
};
