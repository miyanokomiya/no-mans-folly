import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { TAU } from "../../utils/geometry";

export const LineHeadDotBlank: LineHeadStruct<LineHead> = {
  label: "Dot Blank",
  create(arg = {}) {
    return {
      ...arg,
      type: "dot_blank",
    };
  },
  render(ctx, _head, transform, lineWidth) {
    const radius = 6 + lineWidth / 2;
    ctx.beginPath();
    ctx.arc(transform[4], transform[5], radius, 0, TAU, true);
    ctx.stroke();
  },
  clip(region, _head, transform, lineWidth) {
    const radius = 6 + lineWidth / 2;
    region.moveTo(transform[4] + radius, transform[5]);
    region.arc(transform[4], transform[5], radius, 0, TAU, true);
  },
  getWrapperRadius(_head, lineWidth) {
    return 6 + lineWidth;
  },
};
