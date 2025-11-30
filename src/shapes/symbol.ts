import { Shape } from "../models";
import { mapReduce } from "../utils/commons";
import { createFillStyle } from "../utils/fillStyle";
import { createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape, textContainerModule } from "./core";
import { ImageShape, struct as imageStruct } from "./image";

/**
 * Displays the appearance of src shapes.
 * Keeps the original aspect ratio by centering the content.
 *
 * [Aboud duplication]
 * When duplicated:
 * - Symbol shapes keep their original "assetId" as well as image shapes.
 * - Symbol shapes migrate their "src" based on shape references.
 *
 * Therefore, duplicated symbol shapes refer to the original asset files until they are explicitly reloaded.
 *
 * Exceptions:
 * - Symbol shapes keep the original "src" when nothing's migrated.
 * - Symbol shapes migrate their "assetId" when they are restored via template SVG.
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
    let immigrated = false;
    shape.src.forEach((id) => {
      if (oldToNewIdMap[id]) {
        ret.push(oldToNewIdMap[id]);
        immigrated = true;
      } else if (!removeNotFound) {
        ret.push(id);
      }
    });

    // When nothing is immigarated, this shape should keep the original "src" regardless of "removeNotFound" flag.
    // This lets it have the reference to the original shapes.
    if (!immigrated) {
      return {};
    }

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
