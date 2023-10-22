import { Direction2, Shape } from "../../models";
import { COLORS } from "../../utils/color";
import { mapReduce } from "../../utils/commons";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { ShapeStruct, createBaseShape, textContainerModule } from "../core";
import { RectangleShape, struct as rectangleStruct } from "../rectangle";

const DEFAULT_LONG = 300;
const DEFAULT_SHORT = 100;

export type AlignBoxShape = RectangleShape & {
  direction: Direction2;
  gap: number;
};

export const struct: ShapeStruct<AlignBoxShape> = {
  ...rectangleStruct,
  label: "AlignBox",
  create(arg = {}) {
    const direction = arg.direction ?? 1;
    const isHorizontal = isAlignHorizontal(direction);

    return {
      ...createBaseShape(arg),
      type: "align_box",
      fill: arg.fill ?? createFillStyle({ color: COLORS.WHITE }),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? (isHorizontal ? DEFAULT_LONG : DEFAULT_SHORT),
      height: arg.height ?? (!isHorizontal ? DEFAULT_LONG : DEFAULT_SHORT),
      direction,
      gap: arg.gap ?? 10,
    };
  },
  getTextRangeRect: undefined,
  resizeOnTextEdit: undefined,
  ...mapReduce(textContainerModule, () => undefined),
  canAttachSmartBranch: false,
  transparentSelection: true,
};

export function isAlignBoxShape(shape: Shape): shape is AlignBoxShape {
  return shape.type === "align_box";
}

export function isAlignHorizontal(direction: Direction2): boolean {
  return direction === 1;
}
