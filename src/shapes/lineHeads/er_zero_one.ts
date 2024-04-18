import { LineHead } from "../../models";
import { LineHeadStruct, getHeadBaseHeight } from "./core";
import { getRectPoints } from "../../utils/geometry";
import { AffineMatrix, applyAffine, getOuterRectangle, pathSegmentRawsToString } from "okageo";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";
import { LineHeadErZero } from "./er_zero";
import { LineHeadErCore } from "./er_core";

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

    LineHeadErCore.render(ctx, head, transform, lineWidth);
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
        LineHeadErCore.createSVGElementInfo(head, transform, lineWidth)!,
        LineHeadErZero.createSVGElementInfo(head, transform, lineWidth)!,
      ],
    };
  },
  clip(region, head, transform, lineWidth) {
    LineHeadErCore.clip(region, head, transform, lineWidth);
    LineHeadErZero.clip(region, head, transform, lineWidth);
  },
  createSVGClipPathCommand(head, transform, lineWidth) {
    return [
      LineHeadErCore.createSVGClipPathCommand(head, transform, lineWidth)!,
      LineHeadErZero.createSVGClipPathCommand(head, transform, lineWidth)!,
    ].join(" ");
  },
  getWrapperSrcPath(head, lineWidth) {
    return getRectPoints(getOuterRectangle([getSrcPath(lineWidth), LineHeadErZero.getWrapperSrcPath(head, lineWidth)]));
  },
  getRotationOriginDistance(head, lineWidth) {
    return LineHeadErZero.getRotationOriginDistance!(head, lineWidth);
  },
};

function getSrcPath(lineWidth: number) {
  const height = getHeadBaseHeight(lineWidth);
  const width = height;

  return [
    { x: -height / 2, y: -width / 2 },
    { x: -height / 2, y: width / 2 },
  ];
}

function getPath(transform: AffineMatrix, lineWidth: number) {
  return getSrcPath(lineWidth).map((p) => applyAffine(transform, p));
}
