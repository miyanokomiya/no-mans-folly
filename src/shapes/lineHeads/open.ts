import { AffineMatrix, applyAffine, pathSegmentRawsToString } from "okageo";
import { LineHead } from "../../models";
import { LineHeadStruct, getHeadBaseHeight } from "./core";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";

export const LineHeadOpen: LineHeadStruct<LineHead> = {
  label: "Open",
  create(arg = {}) {
    return {
      ...arg,
      type: "open",
    };
  },
  render(ctx, head, transform, lineWidth) {
    ctx.beginPath();
    applyPath(ctx, getPath(transform, lineWidth, head.size));
    ctx.stroke();
  },
  createSVGElementInfo(head, transform, lineWidth) {
    return {
      tag: "path",
      attributes: {
        d: pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth, head.size), [])),
        fill: "none",
      },
    };
  },
  clip() {},
  createSVGClipPathCommand() {
    return undefined;
  },
  getWrapperSrcPath(head, lineWidth) {
    return getSrcPath(lineWidth, head.size);
  },
  getRotationOriginDistance(head, lineWidth) {
    return getHeadBaseHeight(lineWidth, head.size);
  },
};

function getSrcPath(lineWidth: number, size?: number) {
  const height = getHeadBaseHeight(lineWidth, size);
  const width = height;

  return [
    { x: -height, y: -width / 2 },
    { x: 0, y: 0 },
    { x: -height, y: width / 2 },
  ];
}

function getPath(transform: AffineMatrix, lineWidth: number, size?: number) {
  return getSrcPath(lineWidth, size).map((p) => applyAffine(transform, p));
}
