import { Shape } from "../models";
import { mapReduce } from "../utils/commons";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { ImageShape, struct as imageStruct } from "./image";

/**
 * Displays the appearance of src shapes.
 * Keeps the original aspect ratio by centering the content.
 */
export type SymbolShape = ImageShape & { src: string[] };

export const struct: ShapeStruct<SymbolShape> = {
  ...imageStruct,
  label: "Symbol",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "symbol",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      src: arg.src ?? [],
      assetId: arg.assetId,
    };
  },
  immigrateShapeIds(shape, oldToNewIdMap, removeNotFound) {
    const ret: string[] = [];
    shape.src.forEach((id) => {
      if (oldToNewIdMap[id]) {
        ret.push(oldToNewIdMap[id]);
      } else if (!removeNotFound) {
        ret.push(id);
      }
    });
    return { src: ret };
  },
  refreshRelation(shape, availableIdSet) {
    return { src: shape.src.filter((id) => availableIdSet.has(id)) };
  },
  shouldDelete(shape, shapeContext) {
    return !shape.src.some((id) => shapeContext.shapeMap[id]);
  },
  getTextRangeRect: undefined,
  ...mapReduce(textContainerModule, () => undefined),
  canAttachSmartBranch: true,
  shouldKeepAspect: false,
};

export function isSymbolShape(shape: Shape): shape is SymbolShape {
  return shape.type === "symbol";
}
