import { AffineMatrix, applyAffine, pathSegmentRawsToString } from "okageo";
import { LineHead } from "../../models";
import { LineHeadStruct, getHeadBaseHeight } from "./core";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";
import { LineHeadErCore } from "./er_core";

export const LineHeadErOne: LineHeadStruct<LineHead> = {
  label: "EROne",
  create(arg = {}) {
    return {
      ...arg,
      type: "er_one",
    };
  },
  render(ctx, head, transform, lineWidth) {
    LineHeadErCore.render(ctx, head, transform, lineWidth);

    ctx.beginPath();
    applyPath(ctx, getPath(transform, lineWidth, head.size));
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
            d: pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth, head.size), [])),
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
  getWrapperSrcPath(head, lineWidth) {
    return getSrcPath(lineWidth, head.size);
  },
  getRotationOriginDistance(head, lineWidth) {
    return LineHeadErCore.getRotationOriginDistance!(head, lineWidth);
  },
};

function getSrcPath(lineWidth: number, size?: number) {
  const height = getHeadBaseHeight(lineWidth, size);
  const width = height;

  return [
    { x: -height, y: -width / 2 },
    { x: -height, y: width / 2 },
  ];
}

function getPath(transform: AffineMatrix, lineWidth: number, size?: number) {
  return getSrcPath(lineWidth, size).map((p) => applyAffine(transform, p));
}
