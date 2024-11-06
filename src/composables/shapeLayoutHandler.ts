import { EntityPatchInfo, Shape } from "../models";
import { isObjectEmpty, mapFilter, mergeMap, patchPipe } from "../utils/commons";
import { mergeEntityPatchInfo, normalizeEntityPatchInfo } from "../utils/entities";
import { getAlignLayoutPatchFunctions } from "./alignHandler";
import { getBoardLayoutPatchFunctions } from "./boardHandler";
import { getConnectedLinePatch } from "./connectedLineHandler";
import { getCurveLinePatch } from "./curveLineHandler";
import { getLineAttachmentPatch } from "./lineAttachmentHandler";
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
        const nextPatchInfo = normalizeEntityPatchInfo(mergeEntityPatchInfo(patchInfo, { update: patch }));
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
      (_, patch) => getLineRelatedLayoutPatch(updatedComposite, patch),
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
        const nextPatchInfo = normalizeEntityPatchInfo(mergeEntityPatchInfo(adjustedPatchInfo, { update: patch }));
        return patchPipe(
          getAlignLayoutPatchFunctions(
            shapeComposite,
            getNextShapeComposite(shapeComposite, nextPatchInfo),
            nextPatchInfo,
          ),
          {},
        ).patch;
      },
      (_, patch) => getLineRelatedLayoutPatch(updatedComposite, patch),
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
      (_, patch) => getLineRelatedLayoutPatch(updatedComposite, patch),
    ],
    shapeComposite.shapeMap,
  );

  return result.patch;
}

function getLineRelatedLayoutPatch(
  shapeComposite: ShapeComposite,
  initialPatch: { [id: string]: Partial<Shape> },
): { [id: string]: Partial<Shape> } {
  const finishedSet = new Set<string>();
  let nextPatch: { [id: string]: Partial<Shape> } = initialPatch;
  let nextSC = shapeComposite;
  let latestPatch: { [id: string]: Partial<Shape> } = initialPatch;

  const step = (sc: ShapeComposite, currentPatch: { [id: string]: Partial<Shape> }) => {
    const result = patchPipe(
      [
        (_, patch) => getConnectedLinePatch(sc, { update: patch }),
        (_, patch) => getCurveLinePatch(sc, { update: patch }),
        (_, patch) => getLineLabelPatch(sc, { update: patch }),
        (_, patch) => getLineAttachmentPatch(sc, { update: patch }),
      ],
      sc.shapeMap,
      currentPatch,
    );

    latestPatch = mergeMap(latestPatch, result.patch);
    nextSC = getNextShapeComposite(sc, { update: currentPatch });

    nextPatch = mapFilter(
      result.patchList.reduce((p, c) => mergeMap(p, c), {}),
      (p, id) => !finishedSet.has(id) && !isObjectEmpty(p),
    );
    for (const id in nextPatch) {
      finishedSet.add(id);
    }
  };

  while (!isObjectEmpty(nextPatch)) {
    step(nextSC, nextPatch);
  }

  return latestPatch;
}
