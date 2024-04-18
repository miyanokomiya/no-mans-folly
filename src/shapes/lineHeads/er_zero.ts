import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { TAU } from "../../utils/geometry";
import { IVec2, applyAffine, pathSegmentRawsToString } from "okageo";

export const LineHeadErZero: LineHeadStruct<LineHead> = {
  label: "ERZero",
  create(arg = {}) {
    return {
      ...arg,
      type: "er_zero",
    };
  },
  render(ctx, _head, transform, lineWidth) {
    const radius = getRadius(lineWidth);
    const c = applyAffine(transform, getArcCenter(lineWidth));
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, TAU, true);
    ctx.stroke();
  },
  createSVGElementInfo(_head, transform, lineWidth) {
    const radius = getRadius(lineWidth);
    const c = applyAffine(transform, getArcCenter(lineWidth));
    return {
      tag: "ellipse",
      attributes: {
        cx: c.x,
        cy: c.y,
        rx: radius,
        ry: radius,
        fill: "none",
      },
    };
  },
  clip(region, _head, transform, lineWidth) {
    const radius = getRadius(lineWidth);
    const c = applyAffine(transform, getArcCenter(lineWidth));
    region.moveTo(c.x + radius, c.y);
    region.arc(c.x, c.y, radius, 0, TAU, true);
  },
  createSVGClipPathCommand(_head, transform, lineWidth) {
    const radius = getRadius(lineWidth);
    const c = applyAffine(transform, getArcCenter(lineWidth));
    return pathSegmentRawsToString([
      ["M", c.x - radius, c.y],
      ["a", radius, radius, 0, false, false, radius * 2, 0],
      ["a", radius, radius, 0, false, false, -radius * 2, 0],
    ]);
  },
  getWrapperSrcPath(_head, lineWidth) {
    const radius = getRadius(lineWidth);
    const c = getArcCenter(lineWidth);
    return [
      { x: c.x - radius, y: c.y - radius },
      { x: c.x + radius, y: c.y - radius },
      { x: c.x + radius, y: c.y + radius },
      { x: c.x - radius, y: c.y + radius },
    ];
  },
  getRotationOriginDistance(_head, lineWidth) {
    return Math.abs(getArcCenter(lineWidth).x);
  },
};

function getRadius(lineWidth: number): number {
  return 3 + lineWidth * 2;
}

function getArcCenter(lineWidth: number): IVec2 {
  const height = 6 + lineWidth * 4;
  return { x: -height - getRadius(lineWidth), y: 0 };
}
