import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { LineHeadErOne } from "./er_one";
import { LineHeadErMany } from "./er_many";
import { getErHeadBounds } from "./er_core";

export const LineHeadErOneMany: LineHeadStruct<LineHead> = {
  label: "EROneMany",
  create(arg = {}) {
    return {
      ...arg,
      type: "er_one_many",
    };
  },
  render(ctx, head, transform, lineWidth) {
    LineHeadErOne.render(ctx, head, transform, lineWidth);
    LineHeadErMany.render(ctx, head, transform, lineWidth);
  },
  createSVGElementInfo(head, transform, lineWidth) {
    return {
      tag: "g",
      children: [
        LineHeadErOne.createSVGElementInfo(head, transform, lineWidth)!,
        LineHeadErMany.createSVGElementInfo(head, transform, lineWidth)!,
      ],
    };
  },
  clip(region, head, transform, lineWidth) {
    LineHeadErMany.clip(region, head, transform, lineWidth);
  },
  createSVGClipPathCommand(head, transform, lineWidth) {
    return LineHeadErMany.createSVGClipPathCommand(head, transform, lineWidth);
  },
  getWrapperSrcPath(head, lineWidth) {
    return getErHeadBounds(lineWidth, head.size);
  },
  getRotationOriginDistance(head, lineWidth) {
    return LineHeadErOne.getRotationOriginDistance!(head, lineWidth);
  },
};
