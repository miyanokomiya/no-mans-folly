import { AffineMatrix, applyAffine, pathSegmentRawsToString } from "okageo";
import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";

export const LineHeadErOne: LineHeadStruct<LineHead> = {
  label: "EROne",
  create(arg = {}) {
    return {
      ...arg,
      type: "er_one",
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
        d: pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth), [])),
        fill: "none",
      },
    };
  },
  clip() {},
  createSVGClipPathCommand() {
    return undefined;
  },
  getWrapperSrcPath(_head, lineWidth) {
    return getSrcPath(lineWidth);
  },
  getRotationOriginDistance(_head, lineWidth) {
    return 6 + lineWidth * 4;
  },
};

function getSrcPath(lineWidth: number) {
  const height = 6 + lineWidth * 4;
  const width = height;

  return [
    { x: -height, y: -width / 2 },
    { x: -height, y: width / 2 },
  ];
}

function getPath(transform: AffineMatrix, lineWidth: number) {
  return getSrcPath(lineWidth).map((p) => applyAffine(transform, p));
}
