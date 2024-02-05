import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { TAU } from "../../utils/geometry";
import { pathSegmentRawsToString } from "okageo";

export const LineHeadDotFilled: LineHeadStruct<LineHead> = {
  label: "Dot Filled",
  create(arg = {}) {
    return {
      ...arg,
      type: "dot_filled",
    };
  },
  render(ctx, _head, transform, lineWidth) {
    const radius = getRadius(lineWidth);
    ctx.beginPath();
    ctx.arc(transform[4], transform[5], radius, 0, TAU, true);

    const tmp = ctx.fillStyle;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.fillStyle = tmp;
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
    return pathSegmentRawsToString([
      ["M", transform[4] - radius, transform[5]],
      ["a", radius, radius, 0, false, false, radius * 2, 0],
      ["a", radius, radius, 0, false, false, -radius * 2, 0],
    ]);
  },
  getWrapperSrcPath(_head, lineWidth) {
    const rad = getRadius(lineWidth);
    return [
      { x: -rad, y: -rad },
      { x: rad, y: -rad },
      { x: rad, y: rad },
      { x: -rad, y: rad },
    ];
  },
};

function getRadius(lineWidth: number): number {
  return 6 + lineWidth / 2;
}
