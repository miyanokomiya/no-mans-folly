import { AffineMatrix, applyAffine, pathSegmentRawsToString } from "okageo";
import { LineHead } from "../../models";
import { LineHeadStruct, getHeadBaseHeight } from "./core";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";
import { LineHeadErCore } from "./er_core";

export const LineHeadErMany: LineHeadStruct<LineHead> = {
  label: "ERMany",
  create(arg = {}) {
    return {
      ...arg,
      type: "er_many",
    };
  },
  render(ctx, head, transform, lineWidth) {
    LineHeadErCore.render(ctx, head, transform, lineWidth);

    ctx.beginPath();
    applyPath(ctx, getPath(transform, lineWidth));
    ctx.stroke();
  },
  createSVGElementInfo(head, transform, lineWidth) {
    return {
      tag: "g",
      children: [
        LineHeadErCore.createSVGElementInfo(head, transform, lineWidth)!,
        {
          tag: "path",
          attributes: {
            d: pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth), [])),
            fill: "none",
          },
        },
      ],
    };
  },
  clip(region, head, transform, lineWidth) {
    LineHeadErCore.clip(region, head, transform, lineWidth);
  },
  createSVGClipPathCommand(head, transform, lineWidth) {
    return LineHeadErCore.createSVGClipPathCommand(head, transform, lineWidth);
  },
  getWrapperSrcPath(_head, lineWidth) {
    return getSrcPath(lineWidth);
  },
  getRotationOriginDistance(head, lineWidth) {
    return LineHeadErCore.getRotationOriginDistance!(head, lineWidth);
  },
};

function getSrcPath(lineWidth: number) {
  const height = getHeadBaseHeight(lineWidth);
  const width = height;

  return [
    { x: 0, y: -width / 2 },
    { x: -height, y: 0 },
    { x: 0, y: width / 2 },
  ];
}

function getPath(transform: AffineMatrix, lineWidth: number) {
  return getSrcPath(lineWidth).map((p) => applyAffine(transform, p));
}
