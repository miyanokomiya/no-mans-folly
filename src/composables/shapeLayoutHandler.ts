import { EntityPatchInfo, Shape } from "../models";
import { patchPipe } from "../utils/commons";
import { getBoardLayoutPatchFunctions } from "./boardHandler";
import { getConnectedLinePatch } from "./connectedLineHandler";
import { getLineLabelPatch } from "./lineLabelHandler";
import { ShapeComposite, getNextShapeComposite } from "./shapeComposite";
import { getTreeLayoutPatchFunctions } from "./treeHandler";

/**
 * Genaral porpus patch function to recalculate all layouts and automatic adjustments.
 * Returned patch includes src patch supplied as an argument.
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
      ...getBoardLayoutPatchFunctions(shapeComposite, updatedComposite, patchInfo),
      (_, patch) => getConnectedLinePatch(shapeComposite, { update: patch }),
      (_, patch) => getLineLabelPatch(shapeComposite, { update: patch }),
    ],
    shapeComposite.shapeMap,
  );

  return result.patch;
}

/**
 * Similar to "getPatchByLayouts" but proc only automatic adjustments.
 * Returned patch includes src patch supplied as an argument.
 */
export function getPatchAfterLayouts(
  shapeComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): { [id: string]: Partial<Shape> } {
  const result = patchPipe(
    [
      () => patchInfo.update ?? {},
      (_, patch) => getConnectedLinePatch(shapeComposite, { update: patch }),
      (_, patch) => getLineLabelPatch(shapeComposite, { update: patch }),
    ],
    shapeComposite.shapeMap,
  );

  return result.patch;
}
