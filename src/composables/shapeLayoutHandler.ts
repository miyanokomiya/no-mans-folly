import { EntityPatchInfo, Shape } from "../models";
import { mergeMap, patchPipe } from "../utils/commons";
import { getAlignLayoutPatchFunctions } from "./alignHandler";
import { getBoardLayoutPatchFunctions } from "./boardHandler";
import { getConnectedLinePatch } from "./connectedLineHandler";
import { getCurveLinePatch } from "./curveLineHandler";
import { getLineLabelPatch } from "./lineLabelHandler";
import { ShapeComposite, getNextShapeComposite } from "./shapeComposite";
import { getTreeLayoutPatchFunctions } from "./shapeHandlers/treeHandler";

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
      (_, patch) => {
        const nextPatchInfo = {
          ...patchInfo,
          update: mergeMap(patchInfo.update ?? {}, patch),
        };
        return patchPipe(
          getAlignLayoutPatchFunctions(
            shapeComposite,
            getNextShapeComposite(shapeComposite, nextPatchInfo),
            nextPatchInfo,
          ),
          {},
        ).patch;
      },
      // Use "updatedComposite" from here that contains newly added shapes.
      (_, patch) => getConnectedLinePatch(updatedComposite, { update: patch }),
      (_, patch) => getCurveLinePatch(updatedComposite, { update: patch }),
      (_, patch) => getLineLabelPatch(updatedComposite, { update: patch }),
    ],
    shapeComposite.shapeMap,
  );

  return result.patch;
}

/**
 * Delete shapes that can no longer exist under the updated environment.
 * Other than that, same as "getPatchByLayouts"
 */
export function getPatchInfoByLayouts(
  shapeComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): EntityPatchInfo<Shape> {
  const updatedCompositeBeforeDelete = getNextShapeComposite(shapeComposite, patchInfo);
  const shouldDeleteIds = updatedCompositeBeforeDelete.shapes
    .filter((s) => updatedCompositeBeforeDelete.shouldDelete(s))
    .map((s) => s.id);
  const updatedComposite =
    shouldDeleteIds.length > 0
      ? getNextShapeComposite(updatedCompositeBeforeDelete, { delete: shouldDeleteIds })
      : updatedCompositeBeforeDelete;
  const adjustedPatchInfo =
    shouldDeleteIds.length > 0
      ? {
          ...patchInfo,
          delete: [...(patchInfo.delete ?? []), ...shouldDeleteIds],
        }
      : patchInfo;

  const patchResult = patchPipe(
    [
      () => adjustedPatchInfo.update ?? {},
      ...getTreeLayoutPatchFunctions(shapeComposite, updatedComposite, adjustedPatchInfo),
      ...getBoardLayoutPatchFunctions(shapeComposite, updatedComposite, adjustedPatchInfo),
      (_, patch) => {
        const nextPatchInfo = {
          ...adjustedPatchInfo,
          update: mergeMap(adjustedPatchInfo.update ?? {}, patch),
        };
        return patchPipe(
          getAlignLayoutPatchFunctions(
            shapeComposite,
            getNextShapeComposite(shapeComposite, nextPatchInfo),
            nextPatchInfo,
          ),
          {},
        ).patch;
      },
      (_, patch) => getConnectedLinePatch(updatedComposite, { update: patch }),
      (_, patch) => getCurveLinePatch(updatedComposite, { update: patch }),
      (_, patch) => getLineLabelPatch(updatedComposite, { update: patch }),
    ],
    shapeComposite.shapeMap,
  );

  return {
    add: adjustedPatchInfo.add,
    update: patchResult.patch,
    delete: adjustedPatchInfo.delete,
  };
}

/**
 * Similar to "getPatchByLayouts" but proc only automatic adjustments.
 * Returned patch includes src patch supplied as an argument.
 */
export function getPatchAfterLayouts(
  shapeComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): { [id: string]: Partial<Shape> } {
  const updatedComposite = getNextShapeComposite(shapeComposite, patchInfo);

  const result = patchPipe(
    [
      () => patchInfo.update ?? {},
      // Use "updatedComposite" from here that contains newly added shapes.
      (_, patch) => getConnectedLinePatch(updatedComposite, { update: patch }),
      (_, patch) => getCurveLinePatch(updatedComposite, { update: patch }),
      (_, patch) => getLineLabelPatch(updatedComposite, { update: patch }),
    ],
    shapeComposite.shapeMap,
  );

  return result.patch;
}
