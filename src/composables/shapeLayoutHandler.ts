import { EntityPatchInfo, Shape } from "../models";
import { patchPipe } from "../utils/commons";
import { ShapeComposite, getNextShapeComposite } from "./shapeComposite";
import { getTreeLayoutPatchFunctions } from "./treeHandler";

export function getPatchByLayouts(
  shapeComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): { [id: string]: Partial<Shape> } {
  const updatedComposite = getNextShapeComposite(shapeComposite, patchInfo);

  const result = patchPipe(
    [() => patchInfo.update ?? {}, ...getTreeLayoutPatchFunctions(shapeComposite, updatedComposite, patchInfo)],
    shapeComposite.shapeMap,
  );

  return result.patch;
}
