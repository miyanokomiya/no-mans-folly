import { EntityPatchInfo, Shape } from "../models";
import { getConnections, isLineShape } from "../shapes/line";
import { isLineLabelShape } from "../shapes/utils/lineLabel";
import { isObjectEmpty, mapFilter, mergeMap, patchPipe } from "../utils/commons";
import { mergeEntityPatchInfo, normalizeEntityPatchInfo } from "../utils/entities";
import { DependencyMap, topSortHierarchy } from "../utils/graph";
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
    nextSC = getNextShapeComposite(sc, { update: currentPatch });

    nextPatch = mapFilter(
      result.patchList.reduce((p, c) => mergeMap(p, c), {}),
      (p, id) => !finishedSet.has(id) && !isObjectEmpty(p),
    );
  };

  // Get dependency hierarchy of initial patch.
  // => Proc "step" in this order.
  const depMap = getLineRelatedDepMap(shapeComposite, Object.keys(initialPatch));
  const sorted = topSortHierarchy(depMap);
  sorted.forEach((ids) => {
    if (ids.length === 0) return;

    step(nextSC, nextPatch);
    ids.forEach((id) => finishedSet.add(id));
  });

  // Keep procing "step" until converges.
  // This should converge unless circular dependency exists.
  // Even with circular dependencies, this must end due to "finishedSet".
  while (!isObjectEmpty(nextPatch)) {
    step(nextSC, nextPatch);
    for (const id in nextPatch) {
      finishedSet.add(id);
    }
  }

  return latestPatch;
}

/**
 * Returns dependency map only having ids as keys.
 */
function getLineRelatedDepMap(shapeComposite: ShapeComposite, ids: string[]): DependencyMap {
  const depSrc: DependencyMap = new Map();

  const step = (id: string) => {
    const s = shapeComposite.shapeMap[id];
    const deps = new Set<string>();

    if (shapeComposite.attached(s)) {
      deps.add(s.attachment.id);
    }
    if (isLineShape(s)) {
      getConnections(s).forEach((c) => {
        if (c && shapeComposite.shapeMap[c.id]) {
          deps.add(c.id);
        }
      });
    }
    if (isLineLabelShape(shapeComposite, s)) {
      deps.add(s.parentId);
    }

    depSrc.set(id, deps);
  };
  ids.forEach((id) => step(id));

  return depSrc;
}
