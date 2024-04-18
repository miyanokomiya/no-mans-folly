import { LineHead } from "../../models";
import { LineHeadStruct } from "./core";
import { LineHeadErOne } from "./er_one";
import { LineHeadErMany } from "./er_many";

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
  clip() {},
  createSVGClipPathCommand() {
    return undefined;
  },
  getWrapperSrcPath(_head, lineWidth) {
    const height = 6 + lineWidth * 4;
    const width = height;
    return [
      { x: -height, y: -width / 2 },
      { x: 0, y: -width / 2 },
      { x: 0, y: width / 2 },
      { x: -height, y: width / 2 },
    ];
  },
  getRotationOriginDistance(head, lineWidth) {
    return LineHeadErOne.getRotationOriginDistance!(head, lineWidth);
  },
};
