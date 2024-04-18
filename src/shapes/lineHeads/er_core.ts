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
  clip(region, _head, transform, lineWidth) {
    const path = getClipPath(transform, lineWidth);
    applyPath(region, path, true);
  },
  createSVGClipPathCommand(_head, transform, lineWidth) {
    const path = getClipPath(transform, lineWidth);
    return pathSegmentRawsToString(createSVGCurvePath(path, [], true));
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
  return [
    { x: -height, y: 0 },
    { x: 0, y: 0 },
  ];
}

function getPath(transform: AffineMatrix, lineWidth: number) {
  return getSrcPath(lineWidth).map((p) => applyAffine(transform, p));
}

export function getErHeadBounds(lineWidth: number): IVec2[] {
  const height = getHeadBaseHeight(lineWidth);
  const width = height;

  return [
    { x: -height, y: -width / 2 },
    { x: 0, y: -width / 2 },
    { x: 0, y: width / 2 },
    { x: -height, y: width / 2 },
  ];
}

function getClipPath(transform: AffineMatrix, lineWidth: number): IVec2[] {
  return getErHeadBoundsForClip(lineWidth).map((p) => applyAffine(transform, p));
}

function getErHeadBoundsForClip(lineWidth: number): IVec2[] {
  const height = getHeadBaseHeight(lineWidth);
  const width = height;

  // Expand a little towards the head in case curved line sticks out the area.
  return [
    { x: -height, y: -width / 2 },
    { x: lineWidth / 2, y: -width / 2 },
    { x: lineWidth / 2, y: width / 2 },
    { x: -height, y: width / 2 },
  ];
}
