import { add, getCenter, getDistance, getRadian, getRectCenter, IVec2, rotate, sub } from "okageo";
import { EntityPatchInfo, Shape, StyleScheme } from "../models";
import { isLineShape } from "../shapes/line";
import { findBackward, mapEach, mapReduce, patchPipe, toMap } from "../utils/commons";
import { getLocationFromRateOnRectPath, getRotationAffine, TAU } from "../utils/geometry";
import { ShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { getAffineByMoveToAttachedPoint } from "./lineAttachmentHandler";
import { CanvasCTX } from "../utils/types";
import { applyFillStyle } from "../utils/fillStyle";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { defineShapeHandler } from "./shapeHandlers/core";
import { renderOutlinedCircle } from "../utils/renderer";
import { COLORS } from "../utils/color";

export function getAttachmentOption(
  shapeComposite: ShapeComposite,
  targetIds: string[],
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
  targetIds: string[],
): Record<string, Partial<Shape>> {
  return mapReduce(
    toMap(
      targetIds.map((id) => shapeComposite.shapeMap[id]).filter((s) => !!s && canDetachFromShape(shapeComposite, s)),
    ),
    () => ({ attachment: undefined }),
  );
}

interface ShapeAttachmentLayoutHandler {
  onModified(updatedMap: { [id: string]: Partial<Shape> }): { [id: string]: Partial<Shape> };
}

interface ShapeAttachmentLayoutHandlerOption {
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">;
}

function newShapeAttachmentLayoutHandler(option: ShapeAttachmentLayoutHandlerOption): ShapeAttachmentLayoutHandler {
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
          sourceShape.attachment.anchor,
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
                getRectCenter(shapeComposite.getWrapperRect(sourceShape)),
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
                nextAnchorP,
              );
              return mapReduce(src, (s) => shapeComposite.transformShape(s, translateAffine));
            },
          ],
          toMap(allTargetShapes),
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
  updatedMap: { [id: string]: Partial<Shape> },
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
  patchInfo: EntityPatchInfo<Shape>,
): { [id: string]: Partial<Shape> } {
  if (!patchInfo.update) return {};

  const handler = newShapeAttachmentLayoutHandler({
    ctx: { getShapeComposite: () => srcComposite },
  });
  return handler.onModified(patchInfo.update);
}

function renderShapeAttachments(
  ctx: CanvasCTX,
  option: {
    scale: number;
    style: StyleScheme;
    shapeComposite: ShapeComposite;
    targets: Shape[];
  },
) {
  const { shapeComposite, scale, style } = option;
  const infoList = option.targets.map((s) => getAttachmentPoints(shapeComposite, s)).filter((info) => !!info);
  if (infoList.length === 0) return;

  applyStrokeStyle(ctx, {
    color: style.selectionPrimary,
    width: 3 * scale,
    dash: "dot",
  });
  ctx.beginPath();
  infoList.forEach(([anchorP, toP]) => {
    ctx.moveTo(anchorP.x, anchorP.y);
    ctx.lineTo(toP.x, toP.y);
  });
  ctx.stroke();

  applyFillStyle(ctx, { color: style.selectionPrimary });
  infoList.forEach(([anchorP]) => {
    ctx.beginPath();
    ctx.arc(anchorP.x, anchorP.y, 6 * scale, 0, TAU);
    ctx.fill();
  });

  applyFillStyle(ctx, { color: style.selectionPrimary });
  infoList.forEach(([, toP]) => {
    ctx.beginPath();
    ctx.arc(toP.x, toP.y, 6 * scale, 0, TAU);
    ctx.fill();
  });
}

function getAttachmentPoints(shapeComposite: ShapeComposite, shape: Shape): [anchorP: IVec2, toP: IVec2] | undefined {
  if (!shape.attachment) return;

  const target = shapeComposite.shapeMap[shape.attachment.id];
  if (!target || !shapeComposite.canBeShapeAttached(target)) return;

  const sourcePath = shapeComposite.getLocalRectPolygon(shape);
  const anchorP = getLocationFromRateOnRectPath(sourcePath, shape.rotation, shape.attachment.anchor);
  const targetPath = shapeComposite.getLocalRectPolygon(target);
  const toP = getLocationFromRateOnRectPath(targetPath, target.rotation, shape.attachment.to);
  return [anchorP, toP];
}

const ANCHOR_SIZE = 8;

type HitAnchor = Readonly<[type: "detach", p: IVec2, id: string, rotation: number]>;

export interface ShapeAttachmentHitResult {
  type: HitAnchor[0];
  id: string;
}

interface ShapeAttachmentHandlerOption {
  getShapeComposite: () => ShapeComposite;
  targetIds: string[];
}

export const newShapeAttachmentHandler = defineShapeHandler<ShapeAttachmentHitResult, ShapeAttachmentHandlerOption>(
  (option) => {
    function getDetachAnchors(): HitAnchor[] {
      const shapeComposite = option.getShapeComposite();
      return option.targetIds
        .map((id) => {
          const s = shapeComposite.shapeMap[id];
          const info = getAttachmentPoints(shapeComposite, s);
          if (!info) return;
          return ["detach", getCenter(info[0], info[1]), id, getRadian(info[0], info[1])] as const;
        })
        .filter((info) => !!info);
    }

    function hitTest(p: IVec2, scale = 1): ShapeAttachmentHitResult | undefined {
      const threshold = ANCHOR_SIZE * scale;
      const hit = findBackward(getDetachAnchors(), (a) => getDistance(a[1], p) <= threshold);
      if (hit) {
        return { type: hit[0], id: hit[2] };
      }
    }

    function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: ShapeAttachmentHitResult) {
      const shapeComposite = option.getShapeComposite();
      renderShapeAttachments(ctx, {
        scale,
        style,
        shapeComposite,
        targets: option.targetIds.map((id) => shapeComposite.shapeMap[id]).filter((s) => !!s),
      });

      const threshold = ANCHOR_SIZE * scale;
      const anchors = getDetachAnchors();

      applyStrokeStyle(ctx, { color: COLORS.BLACK, width: 2 * scale });
      anchors.forEach((anchor) => {
        if (hitResult?.type === anchor[0] && hitResult?.id === anchor[2]) {
          renderOutlinedCircle(ctx, anchor[1], threshold, style.selectionSecondaly);
        } else {
          renderOutlinedCircle(ctx, anchor[1], threshold, style.alert);
        }
        ctx.beginPath();
        const v = rotate({ x: threshold, y: 0 }, anchor[3] + Math.PI / 2);
        ctx.moveTo(anchor[1].x + v.x, anchor[1].y + v.y);
        ctx.lineTo(anchor[1].x - v.x, anchor[1].y - v.y);
        ctx.stroke();
      });
    }

    return {
      hitTest,
      render,
      isSameHitResult: (a, b) => {
        return a?.type === b?.type && a?.id === b?.id;
      },
    };
  },
);
export type ShapeAttachmentHandler = ReturnType<typeof newShapeAttachmentHandler>;
