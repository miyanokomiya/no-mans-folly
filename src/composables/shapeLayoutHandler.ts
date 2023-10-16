import { EntityPatchInfo, Shape } from "../models";
import { patchPipe } from "../utils/commons";
import { getConnectedLinePatch } from "./connectedLineHandler";
import { ShapeComposite, getNextShapeComposite } from "./shapeComposite";
import { getTreeLayoutPatchFunctions } from "./treeHandler";

/**
 * Genaral porpus patch function to recalculate all layouts and automatic adjustments.
 */
export function getPatchByLayouts(
  shapeComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): { [id: string]: Partial<Shape> } {
  const updatedComposite = getNextShapeComposite(shapeComposite, patchInfo);

  const result = patchPipe(
    [
      () => patchInfo.update ?? {},
      ...getTreeLayoutPatchFunctions(shapeComposite, updatedComposite, patchInfo),
      (_, patch) => getConnectedLinePatch(shapeComposite, { update: patch }),
    ],
    shapeComposite.shapeMap,
  );

  return result.patch;
}

/**
 * Similar to "getPatchByLayouts" but proc only automatic adjustments.
 */
export function getPatchAfterLayouts(
  shapeComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): { [id: string]: Partial<Shape> } {
  const result = patchPipe(
    [() => patchInfo.update ?? {}, () => getConnectedLinePatch(shapeComposite, patchInfo)],
    shapeComposite.shapeMap,
  );

  return result.patch;
}
