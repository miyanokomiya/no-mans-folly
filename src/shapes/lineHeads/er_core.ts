import { AffineMatrix, IVec2, applyAffine, pathSegmentRawsToString } from "okageo";
import { LineHead } from "../../models";
import { LineHeadStruct, getHeadBaseHeight } from "./core";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";

export const LineHeadErCore: LineHeadStruct<LineHead> = {
  label: "ERCore",
  create(arg = {}) {
    return {
      ...arg,
      type: "er_core",
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
  clip(region, head, transform, lineWidth) {
    const path = getClipPath(transform, lineWidth, head.size);
    applyPath(region, path, true);
  },
  createSVGClipPathCommand(head, transform, lineWidth) {
    const path = getClipPath(transform, lineWidth, head.size);
    return pathSegmentRawsToString(createSVGCurvePath(path, [], true));
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
  return [
    { x: -height, y: 0 },
    { x: 0, y: 0 },
  ];
}

function getPath(transform: AffineMatrix, lineWidth: number, size?: number) {
  return getSrcPath(lineWidth, size).map((p) => applyAffine(transform, p));
}

export function getErHeadBounds(lineWidth: number, size?: number): IVec2[] {
  const height = getHeadBaseHeight(lineWidth, size);
  const width = height;

  return [
    { x: -height, y: -width / 2 },
    { x: 0, y: -width / 2 },
    { x: 0, y: width / 2 },
    { x: -height, y: width / 2 },
  ];
}

function getClipPath(transform: AffineMatrix, lineWidth: number, size?: number): IVec2[] {
  return getErHeadBoundsForClip(lineWidth, size).map((p) => applyAffine(transform, p));
}

function getErHeadBoundsForClip(lineWidth: number, size?: number): IVec2[] {
  const height = getHeadBaseHeight(lineWidth, size);
  const width = height;

  // Expand a little towards the head in case curved line sticks out the area.
  return [
    { x: -height, y: -width / 2 },
    { x: lineWidth / 2, y: -width / 2 },
    { x: lineWidth / 2, y: width / 2 },
    { x: -height, y: width / 2 },
  ];
}
