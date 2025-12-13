import { add, getRectCenter, rotate, sub } from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import { isLineShape } from "../shapes/line";
import { mapEach, mapReduce, patchPipe, toMap } from "../utils/commons";
import { getLocationFromRateOnRectPath, getLocationRateOnRectPath, getRotationAffine } from "../utils/geometry";
import { ShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { getAffineByMoveToAttachedPoint } from "./lineAttachmentHandler";

export function getAttachmentOption(
  shapeComposite: ShapeComposite,
  targetIds: string[]
): "attach" | "detach" | undefined {
  const canAttach = canAttachToShapeByIds(shapeComposite, targetIds);
  if (!canAttach) return;

  // Retruns "detach" when all shapes have "attachment"
  const attachableShapes = targetIds
    .map((id) => shapeComposite.shapeMap[id])
    .filter((s) => !!s && shapeComposite.canAttach(s));
  return attachableShapes.some((s) => !s.attachment) ? "attach" : "detach";
}

function canAttachToShapeByIds(shapeComposite: ShapeComposite, targetIds: string[]): boolean {
  return targetIds.some((id) => {
    const s = shapeComposite.shapeMap[id];
    return !!s && shapeComposite.canAttach(s);
  });
}

export function canDetachFromShape(shapeComposite: ShapeComposite, shape: Shape): boolean {
  if (!shapeComposite.canAttach(shape)) return false;
  return !!shape.attachment;
}

export function getPatchByDetachFromShape(
  shapeComposite: ShapeComposite,
  targetIds: string[]
): Record<string, Partial<Shape>> {
  return mapReduce(
    toMap(
      targetIds.map((id) => shapeComposite.shapeMap[id]).filter((s) => !!s && canDetachFromShape(shapeComposite, s))
    ),
    () => ({ attachment: undefined })
  );
}

export interface ShapeAttachmentHandler {
  onModified(updatedMap: { [id: string]: Partial<Shape> }): { [id: string]: Partial<Shape> };
}

interface Option {
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">;
}

function newShapeAttachmentHandler(option: Option): ShapeAttachmentHandler {
  function onModified(updatedMap: { [id: string]: Partial<Shape> }): { [id: string]: Partial<Shape> } {
    const shapeComposite = option.ctx.getShapeComposite();
    const shapeMap = shapeComposite.shapeMap;
    const attachedMap = getUpdatedAttachedMap(shapeComposite, updatedMap);

    const ret: { [id: string]: Partial<Shape> } = {};
    attachedMap.forEach((attachedIdSet, targetId) => {
      if (attachedIdSet.size === 0) return;

      const target = shapeMap[targetId];
      if (!target || isLineShape(target)) {
        attachedIdSet.forEach((attachedId) => {
          ret[attachedId] = { attachment: undefined };
        });
        return;
      }

      const orgTargetRect = shapeComposite.getLocalRectPolygon(target);
      const nextTargetShapeComposite = shapeComposite.getSubShapeComposite([targetId], updatedMap);
      const nextTarget = nextTargetShapeComposite.shapeMap[targetId];
      const nextTargetRect = nextTargetShapeComposite.getLocalRectPolygon(nextTarget);

      attachedIdSet.forEach((sourceId) => {
        const sourceShape = shapeMap[sourceId];
        if (!sourceShape || !sourceShape.attachment) return;

        const nextSource = { ...sourceShape, ...updatedMap[sourceId] };
        if (!shapeComposite.canAttach(nextSource)) {
          if (sourceShape.attachment) {
            ret[sourceId] = { attachment: undefined };
          }
          return;
        }

        const nextAttachment = nextSource.attachment;
        if (!nextAttachment) return;

        const orgSourceRect = shapeComposite.getLocalRectPolygon(sourceShape);
        const orgAnchorP = getLocationFromRateOnRectPath(
          orgSourceRect,
          sourceShape.rotation,
          sourceShape.attachment.anchor
        );
        const orgToP = getLocationFromRateOnRectPath(orgTargetRect, target.rotation, sourceShape.attachment.to);
        const v = sub(orgAnchorP, orgToP);

        const nextToP = getLocationFromRateOnRectPath(nextTargetRect, nextTarget.rotation, nextAttachment.to);
        const nextAnchorP = add(nextToP, rotate(v, nextTarget.rotation - target.rotation));

        const allTargetShapes = shapeComposite.getAllTransformTargets([sourceId]);

        const patch = patchPipe(
          [
            (src) => {
              // Apply next rotation at first.
              let nextRotation = nextSource.rotation;
              if (nextAttachment.rotationType === "relative") {
                const baseRotation = nextTarget.rotation;
                nextRotation = nextAttachment.rotation + baseRotation;
              }

              const rotateAffine = getRotationAffine(
                nextRotation - sourceShape.rotation,
                getRectCenter(shapeComposite.getWrapperRect(sourceShape))
              );
              return mapReduce(src, (s) => shapeComposite.transformShape(s, rotateAffine));
            },
            (src, update) => {
              // Derive translation affine based on the anchors of rotated shapes.
              const rotatedShapeComposite = shapeComposite.getSubShapeComposite([sourceId], update);
              const translateAffine = getAffineByMoveToAttachedPoint(
                rotatedShapeComposite,
                rotatedShapeComposite.mergedShapeMap[sourceId],
                nextAttachment.anchor,
                nextAnchorP
              );
              return mapReduce(src, (s) => shapeComposite.transformShape(s, translateAffine));
            },
          ],
          toMap(allTargetShapes)
        ).patch;

        for (const id in patch) {
          ret[id] = patch[id];
        }
      });
    });

    return ret;
  }

  return { onModified };
}

/**
 * Returns Map<target id, Set<source id>>
 * Ignores line attachments
 * Attachment handling is required only when target shapes are updated.
 * => When source shapes are updated, their positions don't change.
 */
function getUpdatedAttachedMap(
  shapeComposite: ShapeComposite,
  updatedMap: { [id: string]: Partial<Shape> }
): Map<string, Set<string>> {
  const shapeMap = shapeComposite.shapeMap;
  const updatedIdSet = new Set(Object.keys(updatedMap).filter((id) => shapeMap[id] && !isLineShape(shapeMap[id])));
  const attachedMap = new Map<string, Set<string>>();

  mapEach(shapeMap, (s) => {
    const targetId = s.attachment?.id;
    if (!targetId || !updatedIdSet.has(targetId)) return;
    if (!shapeMap[targetId] || isLineShape(shapeMap[targetId])) return;

    const idSet = attachedMap.get(targetId);
    if (idSet) {
      idSet.add(s.id);
    } else {
      attachedMap.set(targetId, new Set([s.id]));
    }
  });

  return attachedMap;
}

export function getShapeAttachmentPatch(
  srcComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>
): { [id: string]: Partial<Shape> } {
  if (!patchInfo.update) return {};

  const handler = newShapeAttachmentHandler({
    ctx: { getShapeComposite: () => srcComposite },
  });
  return handler.onModified(patchInfo.update);
}
