import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { LineHeadErMany } from "./er_many";
import { getRectPoints } from "../../utils/geometry";
import { getOuterRectangle } from "okageo";
import { LineHeadErZero } from "./er_zero";

export const LineHeadErZeroMany: LineHeadStruct<LineHead> = {
  label: "ERZeroMany",
  create(arg = {}) {
    return {
      ...arg,
      type: "er_zero_many",
    };
  },
  render(ctx, head, transform, lineWidth) {
    LineHeadErMany.render(ctx, head, transform, lineWidth);
    LineHeadErZero.render(ctx, head, transform, lineWidth);
  },
  createSVGElementInfo(head, transform, lineWidth) {
    return {
      tag: "g",
      children: [
        LineHeadErMany.createSVGElementInfo(head, transform, lineWidth)!,
        LineHeadErZero.createSVGElementInfo(head, transform, lineWidth)!,
      ],
    };
  },
  clip(region, head, transform, lineWidth) {
    LineHeadErMany.clip(region, head, transform, lineWidth);
    LineHeadErZero.clip(region, head, transform, lineWidth);
  },
  createSVGClipPathCommand(head, transform, lineWidth) {
    return [
      LineHeadErMany.createSVGClipPathCommand(head, transform, lineWidth)!,
      LineHeadErZero.createSVGClipPathCommand(head, transform, lineWidth)!,
    ].join(" ");
  },
  getWrapperSrcPath(head, lineWidth) {
    return getRectPoints(
      getOuterRectangle([
        LineHeadErMany.getWrapperSrcPath(head, lineWidth),
        LineHeadErZero.getWrapperSrcPath(head, lineWidth),
      ]),
    );
  },
  getRotationOriginDistance(head, lineWidth) {
    return LineHeadErZero.getRotationOriginDistance!(head, lineWidth);
  },
};
