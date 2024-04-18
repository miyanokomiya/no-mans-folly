import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { getRectPoints } from "../../utils/geometry";
import { AffineMatrix, applyAffine, getOuterRectangle, pathSegmentRawsToString } from "okageo";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";
import { LineHeadErZero } from "./er_zero";

export const LineHeadErZeroOne: LineHeadStruct<LineHead> = {
  label: "ERZeroOne",
  create(arg = {}) {
    return {
      ...arg,
      type: "er_zero_one",
    };
  },
  render(ctx, head, transform, lineWidth) {
    ctx.beginPath();
    applyPath(ctx, getPath(transform, lineWidth));
    ctx.stroke();

    LineHeadErZero.render(ctx, head, transform, lineWidth);
  },
  createSVGElementInfo(head, transform, lineWidth) {
    return {
      tag: "g",
      children: [
        {
          tag: "path",
          attributes: {
            d: pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth), [])),
            fill: "none",
          },
        },
        LineHeadErZero.createSVGElementInfo(head, transform, lineWidth)!,
      ],
    };
  },
  clip(region, head, transform, lineWidth) {
    LineHeadErZero.clip(region, head, transform, lineWidth);
  },
  createSVGClipPathCommand(head, transform, lineWidth) {
    return LineHeadErZero.createSVGClipPathCommand(head, transform, lineWidth);
  },
  getWrapperSrcPath(head, lineWidth) {
    return getRectPoints(getOuterRectangle([getSrcPath(lineWidth), LineHeadErZero.getWrapperSrcPath(head, lineWidth)]));
  },
  getRotationOriginDistance(head, lineWidth) {
    return LineHeadErZero.getRotationOriginDistance!(head, lineWidth);
  },
};

function getSrcPath(lineWidth: number) {
  const height = 6 + lineWidth * 4;
  const width = height;

  return [
    { x: -height / 2, y: -width / 2 },
    { x: -height / 2, y: width / 2 },
  ];
}

function getPath(transform: AffineMatrix, lineWidth: number) {
  return getSrcPath(lineWidth).map((p) => applyAffine(transform, p));
}
