import { Direction2, Shape } from "../../models";
import { COLORS } from "../../utils/color";
import { mapReduce } from "../../utils/commons";
import { createFillStyle } from "../../utils/fillStyle";
import { AlignLayoutBox } from "../../utils/layouts/align";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape, textContainerModule } from "../core";
import { RectangleShape, struct as rectangleStruct } from "../rectangle";

const DEFAULT_LONG = 300;
const DEFAULT_SHORT = 100;

export type AlignBoxShape = RectangleShape & {
  direction: Direction2;
  gapC?: AlignLayoutBox["gapC"];
  gapR?: AlignLayoutBox["gapR"];
  baseWidth?: AlignLayoutBox["baseWidth"];
  baseHeight?: AlignLayoutBox["baseHeight"];
  padding?: AlignLayoutBox["padding"];
  alignItems?: AlignLayoutBox["alignItems"];
};

export const struct: ShapeStruct<AlignBoxShape> = {
  ...rectangleStruct,
  label: "AlignBox",
  create(arg = {}) {
    const direction = arg.direction ?? 1;
    const isHorizontal = isAlignHorizontal(direction);
    const width = arg.width ?? (isHorizontal ? DEFAULT_LONG : DEFAULT_SHORT);
    const height = arg.height ?? (!isHorizontal ? DEFAULT_LONG : DEFAULT_SHORT);

    return {
      ...createBaseShape(arg),
      type: "align_box",
      fill: arg.fill ?? createFillStyle({ color: COLORS.WHITE }),
      stroke: arg.stroke ?? createStrokeStyle(),
      width,
      height,
      direction,
      gapC: arg.gapC,
      gapR: arg.gapR,
      padding: arg.padding,
      alignItems: arg.alignItems,
      baseWidth: "baseWidth" in arg ? arg.baseWidth : width,
      baseHeight: "baseHeight" in arg ? arg.baseHeight : height,
    };
  },
  resize(shape, resizingAffine) {
    const resized = rectangleStruct.resize(shape, resizingAffine);

    const ret: Partial<AlignBoxShape> = {};
    let changed = false;
    if (resized.width !== undefined) {
      ret.baseWidth = resized.width;
      changed = true;
    }
    if (resized.height !== undefined) {
      ret.baseHeight = resized.height;
      changed = true;
    }

    return changed ? { ...resized, ...ret } : resized;
  },
  getTextRangeRect: undefined,
  resizeOnTextEdit: undefined,
  ...mapReduce(textContainerModule, () => undefined),
  canAttachSmartBranch: false,
  transparentSelection: true,
  unboundChildren: true,
};

export function isAlignBoxShape(shape: Shape): shape is AlignBoxShape {
  return shape.type === "align_box";
}

export function isAlignHorizontal(direction: Direction2): boolean {
  return direction === 1;
}
