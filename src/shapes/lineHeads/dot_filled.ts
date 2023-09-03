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
  render(ctx, _head, transform) {
    const radius = 10;
    ctx.beginPath();
    ctx.arc(transform[4], transform[5], radius, 0, Math.PI * 2, true);
    ctx.fill();
  },
  clip(region, _head, transform) {
    const radius = 10;

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
