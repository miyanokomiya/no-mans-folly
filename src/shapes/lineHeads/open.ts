import { applyAffine } from "okageo";
import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { applyPath } from "../../utils/renderer";

export const LineHeadOpen: LineHeadStruct<LineHead> = {
  label: "Open",
  create(arg = {}) {
    return {
      ...arg,
      type: "open",
    };
  },
  render(ctx, _head, transform, lineWidth) {
    const height = 16 + lineWidth;
    const width = 20 + lineWidth;

    ctx.beginPath();
    applyPath(
      ctx,
      [
        { x: -height, y: -width / 2 },
        { x: 0, y: 0 },
        { x: -height, y: width / 2 },
      ].map((p) => applyAffine(transform, p))
    );
    ctx.stroke();
  },
  clip(region, _head, transform, lineWidth) {
    const height = 12 + lineWidth;
    const width = 12 + lineWidth;

    applyPath(
      region,
      [
        { x: 0, y: 0 },
        { x: 0, y: -width / 2 },
        { x: -height, y: -width / 2 },
        { x: 0, y: 0 },
        { x: -height, y: width / 2 },
        { x: 0, y: width / 2 },
      ].map((p) => applyAffine(transform, p)),
      true
    );
  },
};
