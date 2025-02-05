import { EntityPatchInfo, Shape } from "../models";
import { refreshShapeRelations } from "../shapes";
import { isObjectEmpty, mapEach, mapFilter, mergeMap, patchPipe, toList } from "../utils/commons";
import { mergeEntityPatchInfo, normalizeEntityPatchInfo } from "../utils/entities";
import { topSortHierarchy } from "../utils/graph";
import { getAllBranchIds, getTree } from "../utils/tree";
import { getAlignLayoutPatchFunctions } from "./alignHandler";
import { getBoardLayoutPatchFunctions } from "./boardHandler";
import { getConnectedLinePatch } from "./connectedLineHandler";
import { getCurveLinePatch } from "./curveLineHandler";
import { getFrameAlignLayoutPatch } from "./frameGroups/frameAlignGroupHandler";
import { getLineAttachmentPatch } from "./lineAttachmentHandler";
import { getLineLabelPatch } from "./lineLabelHandler";
import { ShapeComposite, getDeleteTargetIds, getNextShapeComposite } from "./shapeComposite";
import { getTreeLayoutPatchFunctions } from "./shapeHandlers/treeHandler";
import { getLineRelatedDependantMap } from "./shapeRelation";

/**
 * This function doesn't recalculate layouts.
 */
export function getEntityPatchByDelete(
  shapeComposite: ShapeComposite,
  deleteIds: string[],
  patch?: { [id: string]: Partial<Shape> },
): EntityPatchInfo<Shape> {
  // Apply patch before getting branch ids in case tree structure changes by the patch.
  // => e.g. ungrouping
  const updatedShapeMap = patch ? patchPipe([() => patch], shapeComposite.shapeMap).result : shapeComposite.shapeMap;
  const deleteAllIds = getDeleteTargetIds(
    shapeComposite,
    getAllBranchIds(getTree(Object.values(updatedShapeMap)), deleteIds),
  );

  const availableIdSet = new Set(shapeComposite.shapes.map((s) => s.id));
  deleteAllIds.forEach((id) => availableIdSet.delete(id));
  const patchByRefreshRelation = refreshShapeRelations(
    shapeComposite.getShapeStruct,
    toList(updatedShapeMap),
    availableIdSet,
  );
  const refreshedPatch = patch ? mergeMap(patch, patchByRefreshRelation) : patchByRefreshRelation;
  const deleteAllIdSet = new Set(deleteAllIds);
  return { update: mapFilter(refreshedPatch, (_, id) => !deleteAllIdSet.has(id)), delete: deleteAllIds };
}

/**
 * Genaral purpose patch function to recalculate all layouts and automatic adjustments.
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
      () => getFrameAlignLayoutPatch(shapeComposite, patchInfo),
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
  const deletedAllIds = [...(patchInfo.delete ?? []), ...shouldDeleteIds];
  const deletedAllIdSet = new Set(deletedAllIds);
  const adjustedPatchInfo = {
    add:
      deletedAllIdSet.size > 0 && patchInfo.add
        ? patchInfo.add.filter((s) => !deletedAllIdSet.has(s.id))
        : patchInfo.add,
    update:
      deletedAllIdSet.size > 0 && patchInfo.update
        ? mapFilter(patchInfo.update, (_, id) => !deletedAllIdSet.has(id))
        : patchInfo.update,
    delete: deletedAllIds,
  };

  const patchResult = patchPipe(
    [
      () => adjustedPatchInfo.update ?? {},
      () => getFrameAlignLayoutPatch(shapeComposite, adjustedPatchInfo),
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
  // When target id is in this set, its patch will be merged into "nextSC" and won't be in "nextPatch".
  const finishedSet = new Set<string>();
  let latestPatch: { [id: string]: Partial<Shape> } = initialPatch;
  let nextPatch: { [id: string]: Partial<Shape> } = initialPatch;
  let nextSC = shapeComposite;

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

    const rawNextPatch = result.patchList.reduce((p, c) => mergeMap(p, c), {});
    const finishedNextPatch: typeof nextPatch = {};
    nextPatch = {};
    mapEach(rawNextPatch, (p, id) => {
      if (isObjectEmpty(p, true)) return;
      if (finishedSet.has(id)) {
        finishedNextPatch[id] = p;
      } else {
        nextPatch[id] = p;
      }
    });

    nextSC = getNextShapeComposite(sc, {
      update: isObjectEmpty(finishedNextPatch) ? currentPatch : mergeMap(currentPatch, finishedNextPatch),
    });
  };

  // Get dependency hierarchy of initial patch.
  // => Proc "step" in this order.
  const depMap = getLineRelatedDependantMap(shapeComposite, Object.keys(initialPatch));
  const sorted = topSortHierarchy(depMap);
  sorted.forEach((ids) => {
    if (ids.length === 0) return;

    const nextPatchPartial = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
      const patch = latestPatch[id];
      if (patch) p[id] = patch;
      return p;
    }, {});

    ids.forEach((id) => finishedSet.add(id));
    if (!isObjectEmpty(nextPatchPartial, true)) {
      step(nextSC, nextPatchPartial);
    }
  });

  // Keep procing "step" until converges.
  // This should converge unless circular dependency exists.
  // Even with circular dependencies, this must end due to "finishedSet".
  while (!isObjectEmpty(nextPatch, true)) {
    step(nextSC, nextPatch);
    for (const id in nextPatch) {
      finishedSet.add(id);
    }
  }

  return latestPatch;
}
