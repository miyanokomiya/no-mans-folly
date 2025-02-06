import { Shape } from "../../models";
import { mapReduce } from "../../utils/commons";
import { ShapeStruct, textContainerModule } from "../core";
import { AlignBoxShape, struct as alignBoxStruct } from "../align/alignBox";
import { FrameGroup } from "./core";
import { createFillStyle } from "../../utils/fillStyle";

export type FrameAlignGroupShape = AlignBoxShape & FrameGroup;

export const struct: ShapeStruct<FrameAlignGroupShape> = {
  ...alignBoxStruct,
  label: "FrameAlignGroup",
  create(arg = {}) {
    return {
      ...alignBoxStruct.create(arg),
      type: "frame_align_group",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      gapC: arg.gapC ?? 10,
      gapR: arg.gapR ?? 10,
      padding: arg.padding ?? [10, 10, 10, 10],
      name: arg.name ?? "new align",
    };
  },
  resize(shape, resizingAffine) {
    const ret = alignBoxStruct.resize(shape, resizingAffine);
    if (ret.rotation !== undefined) {
      delete ret.rotation;
    }
    return ret;
  },
  getTextRangeRect: undefined,
  resizeOnTextEdit: undefined,
  ...mapReduce(textContainerModule, () => undefined),
  canAttachSmartBranch: false,
  transparentSelection: true,
  unboundChildren: true,
  orderPriority: -20,
  rigidMove: true,
  noRotation: true,
};

export function isFrameAlignGroupShape(shape: Shape): shape is FrameAlignGroupShape {
  return shape.type === "frame_align_group";
}
