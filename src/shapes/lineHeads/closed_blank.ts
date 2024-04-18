import { AffineMatrix, applyAffine, pathSegmentRawsToString } from "okageo";
import { LineHead } from "../../models";
import { LineHeadStruct, getHeadBaseHeight } from "./core";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";

export const LineHeadClosedBlankStruct: LineHeadStruct<LineHead> = {
  label: "Closed Blank",
  create(arg = {}) {
    return {
      ...arg,
      type: "closed_blank",
    };
  },
  render(ctx, _head, transform, lineWidth) {
    ctx.beginPath();
    applyPath(ctx, getPath(transform, lineWidth), true);
    ctx.stroke();
  },
  createSVGElementInfo(_head, transform, lineWidth) {
    return {
      tag: "path",
      attributes: {
        d: pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth), [], true)),
        fill: "none",
      },
    };
  },
  clip(region, _head, transform, lineWidth) {
    applyPath(region, getPath(transform, lineWidth), true);
  },
  createSVGClipPathCommand(_head, transform, lineWidth) {
    return pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth), [], true));
  },
  getWrapperSrcPath(_head, lineWidth) {
    return getSrcPath(lineWidth);
  },
  getRotationOriginDistance(_head, lineWidth) {
    return getHeadBaseHeight(lineWidth);
  },
};

function getSrcPath(lineWidth: number) {
  const height = getHeadBaseHeight(lineWidth);
  const width = height;

  return [
    { x: 0, y: 0 },
    { x: -height, y: -width / 2 },
    { x: -height, y: width / 2 },
  ];
}

function getPath(transform: AffineMatrix, lineWidth: number) {
  return getSrcPath(lineWidth).map((p) => applyAffine(transform, p));
}
