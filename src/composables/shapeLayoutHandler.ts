import { EntityPatchInfo, Shape } from "../models";
import { refreshShapeRelations } from "../shapes";
import { isAlignBoxShape } from "../shapes/align/alignBox";
import { isTableShape } from "../shapes/table/table";
import { isObjectEmpty, mapEach, mapFilter, mergeMap, patchPipe, toList } from "../utils/commons";
import { mergeEntityPatchInfo, normalizeEntityPatchInfo } from "../utils/entities";
import { topSortHierarchy } from "../utils/graph";
import { getAllBranchIds, getTree } from "../utils/tree";
import { getNextAlignLayout } from "./alignHandler";
import { getBoardLayoutPatchFunctions } from "./boardHandler";
import { getConnectedLinePatch } from "./connectedLineHandler";
import { getCurveLinePatch } from "./curveLineHandler";
import { getFrameAlignLayoutPatch } from "./frameGroups/frameAlignGroupHandler";
import { getLineAttachmentPatch } from "./lineAttachmentHandler";
import { getLineLabelPatch } from "./lineLabelHandler";
import { getShapeAttachmentPatch } from "./shapeAttachmentHandler";
import { ShapeComposite, getDeleteTargetIds, getNextShapeComposite } from "./shapeComposite";
import { getModifiedLayoutIdsInOrder } from "./shapeHandlers/layoutHandler";
import { getNextTableLayout } from "./shapeHandlers/tableHandler";
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
 * This function can't affect newly added shapes since returned value is patch data for existing shapes.
 * => "getPatchInfoByLayouts" is more thorough.
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
        return getLayoutPatchList(shapeComposite, nextPatchInfo);
      },
      // Use the composite from here that contains newly added shapes.
      (_, patch) => getLineRelatedLayoutPatch(applyAddAndDelete(shapeComposite, patchInfo), patch),
    ],
    shapeComposite.shapeMap,
  );

  return result.patch;
}

/**
 * Delete shapes that can no longer exist under the updated environment.
 * Unlike "getPatchByLayouts", newly added shapes will be updated by layouts.
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
      () => {
        if (!adjustedPatchInfo.add) return adjustedPatchInfo.update ?? {};
        // Mix added shapes into the patch to proc layout logics.
        const ret = { ...adjustedPatchInfo.update };
        adjustedPatchInfo.add.forEach((s) => {
          ret[s.id] = { ...s };
        });
        return ret;
      },
      () => getFrameAlignLayoutPatch(shapeComposite, adjustedPatchInfo),
      ...getTreeLayoutPatchFunctions(shapeComposite, updatedComposite, adjustedPatchInfo),
      ...getBoardLayoutPatchFunctions(shapeComposite, updatedComposite, adjustedPatchInfo),
      (_, patch) => {
        const nextPatchInfo = normalizeEntityPatchInfo(mergeEntityPatchInfo(adjustedPatchInfo, { update: patch }));
        return getLayoutPatchList(shapeComposite, nextPatchInfo);
      },
      (_, patch) => getLineRelatedLayoutPatch(applyAddAndDelete(shapeComposite, adjustedPatchInfo), patch),
    ],
    shapeComposite.shapeMap,
  );

  // Hoist new shapes from the patch to "add" list.
  const add = (adjustedPatchInfo.add ?? []).map((s) => {
    const patch = patchResult.patch[s.id];
    return patch ? { ...s, ...patch } : s;
  });
  const update = { ...patchResult.patch };
  add.forEach((s) => {
    delete update[s.id];
  });

  return {
    add,
    update,
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
  const result = patchPipe(
    [
      () => patchInfo.update ?? {},
      // Use the composite from here that contains newly added shapes.
      (_, patch) => getLineRelatedLayoutPatch(applyAddAndDelete(shapeComposite, patchInfo), patch),
    ],
    shapeComposite.shapeMap,
  );

  return result.patch;
}

/**
 * "shapeComposite" should be the one before applying "initialPatch".
 * Other than "initialPatch", it can contain add/delete updates. See "applyAddAndDelete".
 */
function getLineRelatedLayoutPatch(
  shapeComposite: ShapeComposite,
  initialPatch: { [id: string]: Partial<Shape> },
): { [id: string]: Partial<Shape> } {
  // Get dependency hierarchy of initial patch.
  // => Proc "step" in this order.
  const depMap = getLineRelatedDependantMap(shapeComposite, Object.keys(initialPatch));
  const sorted = topSortHierarchy(depMap);
  const allDepIdSet = new Set(sorted.flat());

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
        (_, patch) => getShapeAttachmentPatch(sc, { update: patch }),
      ],
      sc.shapeMap,
      currentPatch,
    );

    latestPatch = mergeMap(latestPatch, result.patch);

    const rawNextPatch = result.patchList.reduce((p, c) => mergeMap(p, c), {});
    const finishedNextPatch: typeof nextPatch = {};
    nextPatch = {};
    mapEach(rawNextPatch, (p, id) => {
      if (isObjectEmpty(p)) {
        if (!finishedSet.has(id) && allDepIdSet.has(id) && latestPatch[id]) {
          // When a patch for unfinished-dep shape is empty, discard the current patch for it.
          // => It should be evaluated with its original attributes when it's in "finishedSet".
          //
          // Note: Resizing a shape that is connected by a line with a label with "Preserve connection" needs this treatment.
          //    In this case, the label won't move but its dependencies will move as if the label moved.
          //    The label moves in intermediate steps and these patches are stored in "latestPatch".
          //    However, the label ends up remaining at the original position when it's in "finishedSet" and this step returns empty patch since nothing changes from the original label.
          //    Therefore, the patch made by "step" for the label in "latestPatch" has to be discarded.
          latestPatch[id] = initialPatch[id] ?? {};
        }
        return;
      }

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

function applyAddAndDelete(shapeComposite: ShapeComposite, patchInfo: EntityPatchInfo<Shape>) {
  return getNextShapeComposite(shapeComposite, { add: patchInfo.add, delete: patchInfo.delete });
}

function getLayoutPatchList(shapeComposite: ShapeComposite, patchInfo: EntityPatchInfo<Shape>) {
  const nextShapeComposite = getNextShapeComposite(shapeComposite, patchInfo);
  const sorted = getModifiedLayoutIdsInOrder(
    shapeComposite,
    nextShapeComposite,
    patchInfo,
    (s) => isTableShape(s) || isAlignBoxShape(s),
    (s) => isTableShape(s),
  );

  let latestShapeComposite = nextShapeComposite;
  return patchPipe<Shape>(
    sorted.map((ids) => (current, patch) => {
      if (!isObjectEmpty(patch)) {
        latestShapeComposite = getNextShapeComposite(latestShapeComposite, { update: patch });
      }

      return patchPipe<Shape>(
        ids.map((id) => () => {
          const s = latestShapeComposite.mergedShapeMap[id];
          if (isTableShape(s)) {
            return getNextTableLayout(latestShapeComposite, id);
          } else if (isAlignBoxShape(s)) {
            return getNextAlignLayout(latestShapeComposite, id);
          } else {
            return {};
          }
        }),
        current,
      ).patch;
    }),
    latestShapeComposite.shapeMap,
  ).patch;
}
