import { applyAffine } from "okageo";
import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { applyPath } from "../../utils/renderer";

export const LineHeadClosedFilledStruct: LineHeadStruct<LineHead> = {
  label: "Closed Filled",
  create(arg = {}) {
    return {
      ...arg,
      type: "closed_filled",
    };
  },
  render(ctx, _head, transform, lineWidth) {
    const height = 12 + lineWidth;
    const width = 12 + lineWidth;

    ctx.beginPath();
    applyPath(
      ctx,
      [
        { x: 0, y: 0 },
        { x: -height, y: -width / 2 },
        { x: -height, y: width / 2 },
      ].map((p) => applyAffine(transform, p)),
      true,
    );

    const tmp = ctx.fillStyle;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.fillStyle = tmp;
    ctx.stroke();
  },
  clip(region, _head, transform, lineWidth) {
    const height = 12 + lineWidth;
    const width = 12 + lineWidth;

    applyPath(
      region,
      [
        { x: 0, y: -width / 2 },
        { x: -height, y: -width / 2 },
        { x: -height, y: width / 2 },
        { x: 0, y: width / 2 },
      ].map((p) => applyAffine(transform, p)),
      true,
    );
  },
};
