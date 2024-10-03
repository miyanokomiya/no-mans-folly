import { LineHead } from "../../models";
import { LineHeadStruct, getHeadBaseHeight } from "./core";
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
  render(ctx, head, transform, lineWidth) {
    const radius = getRadius(lineWidth, head.size);
    const c = applyAffine(transform, getArcCenter(lineWidth, head.size));
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, TAU, true);
    ctx.stroke();
  },
  createSVGElementInfo(head, transform, lineWidth) {
    const radius = getRadius(lineWidth, head.size);
    const c = applyAffine(transform, getArcCenter(lineWidth, head.size));
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
  clip(region, head, transform, lineWidth) {
    const radius = getRadius(lineWidth, head.size);
    const c = applyAffine(transform, getArcCenter(lineWidth, head.size));
    region.moveTo(c.x + radius, c.y);
    region.arc(c.x, c.y, radius, 0, TAU, true);
  },
  createSVGClipPathCommand(head, transform, lineWidth) {
    const radius = getRadius(lineWidth, head.size);
    const c = applyAffine(transform, getArcCenter(lineWidth, head.size));
    return pathSegmentRawsToString([
      ["M", c.x - radius, c.y],
      ["a", radius, radius, 0, false, false, radius * 2, 0],
      ["a", radius, radius, 0, false, false, -radius * 2, 0],
    ]);
  },
  getWrapperSrcPath(head, lineWidth) {
    const radius = getRadius(lineWidth, head.size);
    const c = getArcCenter(lineWidth, head.size);
    return [
      { x: c.x - radius, y: c.y - radius },
      { x: c.x + radius, y: c.y - radius },
      { x: c.x + radius, y: c.y + radius },
      { x: c.x - radius, y: c.y + radius },
    ];
  },
  getRotationOriginDistance(head, lineWidth) {
    return Math.abs(getArcCenter(lineWidth, head.size).x);
  },
};

function getRadius(lineWidth: number, size?: number): number {
  return getHeadBaseHeight(lineWidth, size) / 2;
}

function getArcCenter(lineWidth: number, size?: number): IVec2 {
  const radius = getRadius(lineWidth, size);
  const height = radius * 2;
  return { x: -height - radius, y: 0 };
}
