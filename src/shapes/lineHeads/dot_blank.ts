import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { TAU } from "../../utils/geometry";
import { pathSegmentRawListToString } from "../../utils/renderer";

export const LineHeadDotBlank: LineHeadStruct<LineHead> = {
  label: "Dot Blank",
  create(arg = {}) {
    return {
      ...arg,
      type: "dot_blank",
    };
  },
  render(ctx, _head, transform, lineWidth) {
    const radius = getRadius(lineWidth);
    ctx.beginPath();
    ctx.arc(transform[4], transform[5], radius, 0, TAU, true);
    ctx.stroke();
  },
  createSVGElementInfo(_head, transform, lineWidth) {
    const radius = getRadius(lineWidth);
    return {
      tag: "ellipse",
      attributes: {
        cx: transform[4],
        cy: transform[5],
        rx: radius,
        ry: radius,
        fill: "none",
      },
    };
  },
  clip(region, _head, transform, lineWidth) {
    const radius = getRadius(lineWidth);
    region.moveTo(transform[4] + radius, transform[5]);
    region.arc(transform[4], transform[5], radius, 0, TAU, true);
  },
  createSVGClipPathCommand(_head, transform, lineWidth) {
    const radius = getRadius(lineWidth);
    return pathSegmentRawListToString([
      ["M", transform[4] - radius, transform[5]],
      ["a", radius, radius, 0, false, false, radius * 2, 0],
      ["a", radius, radius, 0, false, false, -radius * 2, 0],
    ]);
  },
  getWrapperRadius(_head, lineWidth) {
    return 6 + lineWidth;
  },
};

function getRadius(lineWidth: number): number {
  return 6 + lineWidth / 2;
}
