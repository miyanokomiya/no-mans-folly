import { applyAffine } from "okageo";
import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { applyPath } from "../../utils/renderer";

export const LineHeadClosedBlankStruct: LineHeadStruct<LineHead> = {
  label: "Closed Blank",
  create(arg = {}) {
    return {
      ...arg,
      type: "closed_blank",
    };
  },
  render(ctx, _head, transform) {
    const height = 16;
    const width = 20;

    ctx.beginPath();
    applyPath(
      ctx,
      [
        { x: 0, y: 0 },
        { x: -height, y: -width / 2 },
        { x: -height, y: width / 2 },
      ].map((p) => applyAffine(transform, p)),
      true
    );
    ctx.stroke();
  },
  clip(region, _head, transform) {
    const height = 16;
    const width = 20;

    applyPath(
      region,
      [
        { x: 0, y: -width / 2 },
        { x: -height, y: -width / 2 },
        { x: -height, y: width / 2 },
        { x: 0, y: width / 2 },
      ].map((p) => applyAffine(transform, p)),
      true
    );
  },
};
