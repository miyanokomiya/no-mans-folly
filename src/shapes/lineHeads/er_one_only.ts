import { AffineMatrix, applyAffine, pathSegmentRawsToString } from "okageo";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";
import { LineHead } from "../../models";
import { LineHeadStruct, getHeadBaseHeight } from "./core";
import { LineHeadErOne } from "./er_one";
import { LineHeadErCore } from "./er_core";

export const LineHeadErOneOnly: LineHeadStruct<LineHead> = {
  label: "EROneOnly",
  create(arg = {}) {
    return {
      ...arg,
      type: "er_one_only",
    };
  },
  render(ctx, head, transform, lineWidth) {
    LineHeadErOne.render(ctx, head, transform, lineWidth);

    ctx.beginPath();
    applyPath(ctx, getPath(transform, lineWidth, head.size));
    ctx.stroke();
  },
  createSVGElementInfo(head, transform, lineWidth) {
    return {
      tag: "g",
      children: [
        LineHeadErOne.createSVGElementInfo(head, transform, lineWidth)!,
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
    const height = getHeadBaseHeight(lineWidth, head.size);
    const width = height;

    return [
      { x: -height, y: -width / 2 },
      { x: -height / 2, y: -width / 2 },
      { x: 0, y: 0 },
      { x: -height / 2, y: width / 2 },
      { x: -height, y: width / 2 },
    ];
  },
  getRotationOriginDistance(head, lineWidth) {
    return LineHeadErOne.getRotationOriginDistance!(head, lineWidth);
  },
};

function getSrcPath(lineWidth: number, size?: number) {
  const height = getHeadBaseHeight(lineWidth, size);
  const width = height;

  return [
    { x: -height / 2, y: -width / 2 },
    { x: -height / 2, y: width / 2 },
  ];
}

function getPath(transform: AffineMatrix, lineWidth: number, size?: number) {
  return getSrcPath(lineWidth, size).map((p) => applyAffine(transform, p));
}
