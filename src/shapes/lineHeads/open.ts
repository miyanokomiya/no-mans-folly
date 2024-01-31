import { AffineMatrix, applyAffine } from "okageo";
import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { applyPath, createSVGCurvePath, pathSegmentRawListToString } from "../../utils/renderer";

export const LineHeadOpen: LineHeadStruct<LineHead> = {
  label: "Open",
  create(arg = {}) {
    return {
      ...arg,
      type: "open",
    };
  },
  render(ctx, _head, transform, lineWidth) {
    ctx.beginPath();
    applyPath(ctx, getPath(transform, lineWidth));
    ctx.stroke();
  },
  createSVGElementInfo(_head, transform, lineWidth) {
    return {
      tag: "path",
      attributes: {
        d: pathSegmentRawListToString(createSVGCurvePath(getPath(transform, lineWidth), [])),
        fill: "none",
      },
    };
  },
  clip(region, _head, transform, lineWidth) {
    applyPath(region, getClipPath(transform, lineWidth), true);
  },
  createSVGClipPathCommand(_head, transform, lineWidth) {
    return pathSegmentRawListToString(createSVGCurvePath(getClipPath(transform, lineWidth), []));
  },
  getWrapperRadius(_head, lineWidth) {
    return (20 + lineWidth) * Math.SQRT2;
  },
};

function getPath(transform: AffineMatrix, lineWidth: number) {
  const height = 12 + lineWidth;
  const width = height;

  return [
    { x: -height, y: -width / 2 },
    { x: 0, y: 0 },
    { x: -height, y: width / 2 },
  ].map((p) => applyAffine(transform, p));
}

function getClipPath(transform: AffineMatrix, lineWidth: number) {
  const height = 12 + lineWidth;
  const width = height;

  return [
    { x: 0, y: 0 },
    { x: 0, y: -width / 2 },
    { x: -height, y: -width / 2 },
    { x: 0, y: 0 },
    { x: -height, y: width / 2 },
    { x: 0, y: width / 2 },
  ].map((p) => applyAffine(transform, p));
}
