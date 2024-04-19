import { LineHead } from "../../models";
import { LineHeadStruct, getHeadBaseHeight } from "./core";
import { TAU } from "../../utils/geometry";
import { IVec2, applyAffine, pathSegmentRawsToString } from "okageo";

export const LineHeadDotTopFilled: LineHeadStruct<LineHead> = {
  label: "DotTopFilled",
  create(arg = {}) {
    return {
      ...arg,
      type: "dot_top_filled",
    };
  },
  render(ctx, _head, transform, lineWidth) {
    const radius = getRadius(lineWidth);
    const c = applyAffine(transform, getArcCenter(lineWidth));
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, TAU, true);

    const tmp = ctx.fillStyle;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.fillStyle = tmp;
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
    const rad = getRadius(lineWidth);
    const c = getArcCenter(lineWidth);
    return [
      { x: c.x - rad, y: c.y - rad },
      { x: c.x + rad, y: c.y - rad },
      { x: c.x + rad, y: c.y + rad },
      { x: c.x - rad, y: c.y + rad },
    ];
  },
};

export const LineHeadDotTopBlank: LineHeadStruct<LineHead> = {
  ...LineHeadDotTopFilled,
  label: "DotTopBlank",
  create(arg = {}) {
    return {
      ...arg,
      type: "dot_top_blank",
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
};

function getRadius(lineWidth: number): number {
  return getHeadBaseHeight(lineWidth) / 2;
}

function getArcCenter(lineWidth: number): IVec2 {
  const radius = getRadius(lineWidth);
  return { x: -radius, y: 0 };
}
