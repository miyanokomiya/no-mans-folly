import { clamp, getRadian, IVec2, lerpPoint, moveRect } from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import { isLineShape, LineShape } from "../shapes/line";
import { getLineEdgeInfo } from "../shapes/utils/line";
import { ShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { isObjectEmpty, splitList, toList } from "../utils/commons";
import { getRelativeRateWithinRect } from "../utils/geometry";

export interface LineAttachmentHandler {
  onModified(updatedMap: { [id: string]: Partial<Shape> }): { [id: string]: Partial<Shape> };
}

interface Option {
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">;
}

function newLineAttachmentHandler(option: Option): LineAttachmentHandler {
  function onModified(updatedMap: { [id: string]: Partial<Shape> }): { [id: string]: Partial<Shape> } {
    const shapeComposite = option.ctx.getShapeComposite();
    const shapeMap = shapeComposite.shapeMap;
    const shapeList = Object.values(shapeMap);
    const updatedEntries = Object.entries(updatedMap);
    const ret: { [id: string]: Partial<Shape> } = {};

    const targetLineIds = new Set(updatedEntries.filter(([id]) => isLineShape(shapeMap[id])).map(([id]) => id));
    const attachedMap = new Map<string, Set<string>>();
    shapeList.forEach((s) => {
      if (!s.attachment) return;

      const lineId = s.attachment.id;
      if (!targetLineIds.has(lineId)) {
        if (!updatedMap[s.id]) return; // neither the shape nor the line changes

        targetLineIds.add(lineId);
      }

      const idSet = attachedMap.get(lineId);
      if (idSet) {
        idSet.add(s.id);
      } else {
        attachedMap.set(lineId, new Set([s.id]));
      }
    });

    targetLineIds.forEach((lineId) => {
      const attachedIdSet = attachedMap.get(lineId);
      if (!attachedIdSet || attachedIdSet.size === 0) return;

      const line = shapeMap[lineId];
      if (!line || !isLineShape(line)) {
        attachedIdSet.forEach((attachedId) => {
          ret[attachedId] = { attachment: undefined };
        });
        return;
      }

      const nextLine = { ...line, ...updatedMap[lineId] } as LineShape;
      const nextLineLerpFn = getLineEdgeInfo(nextLine).lerpFn;
      attachedIdSet.forEach((attachedId) => {
        const nextAttached = { ...shapeMap[attachedId], ...updatedMap[attachedId] };
        if (!nextAttached.attachment) return;

        const t = nextAttached.attachment.to.x;
        const toP = nextLineLerpFn(t);
        const patch =
          patchByMoveToAttachedPoint(shapeComposite, nextAttached, nextAttached.attachment.anchor, toP) ?? {};

        if (nextAttached.attachment.rotationType === "relative") {
          const d = 0.001;
          const [ta, tb] = d < t ? [nextLineLerpFn(t - d), toP] : [toP, nextLineLerpFn(t + d)];
          const baseRotation = getRadian(tb, ta);
          const nextRotation = nextAttached.attachment.rotation + baseRotation;

          if (nextAttached.rotation !== nextRotation) {
            patch.rotation = nextRotation;
          }
        }

        if (!isObjectEmpty(patch)) {
          ret[attachedId] = patch;
        }
      });
    });

    return ret;
  }

  return { onModified };
}

export function getLineAttachmentPatch(
  srcComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): { [id: string]: Partial<Shape> } {
  if (!patchInfo.update) return {};

  const handler = newLineAttachmentHandler({
    ctx: { getShapeComposite: () => srcComposite },
  });
  return handler.onModified(patchInfo.update);
}

export function patchByMoveToAttachedPoint(
  shapeComposite: ShapeComposite,
  shape: Shape,
  anchor: IVec2,
  attachedPoint: IVec2,
): Partial<Shape> | undefined {
  const bounds = shapeComposite.getWrapperRect(shape);
  const anchorP = {
    x: bounds.x + bounds.width * anchor.x,
    y: bounds.y + bounds.height * anchor.y,
  };
  return shapeComposite.transformShape(shape, [1, 0, 0, 1, attachedPoint.x - anchorP.x, attachedPoint.y - anchorP.y]);
}

export function getAttachmentAnchorPoint(shapeComposite: ShapeComposite, shape: Shape): IVec2 {
  const bounds = shapeComposite.getWrapperRect(shape);
  const anchor = shape.attachment?.anchor ?? { x: 0.5, y: 0.5 };
  return {
    x: bounds.x + bounds.width * anchor.x,
    y: bounds.y + bounds.height * anchor.y,
  };
}

export function getClosestAnchorAtCenter(shapeComposite: ShapeComposite, shape: Shape, targetCenter: IVec2): IVec2 {
  const bounds = shapeComposite.getWrapperRect(shape);
  const anchor = shape.attachment?.anchor ?? { x: 0.5, y: 0.5 };
  const centeredBounds = moveRect(bounds, { x: bounds.width * (anchor.x - 0.5), y: bounds.height * (anchor.y - 0.5) });
  const rate = getRelativeRateWithinRect(centeredBounds, targetCenter);
  return { x: 1 - clamp(0, 1, rate.x), y: 1 - clamp(0, 1, rate.y) };
}

export function getEvenlySpacedLineAttachmentBetweenFixedOnes(
  shapeMap: { [id: string]: Shape },
  lineId: string,
  selectedShapeIds: string[],
  indexShapeId: string,
  attachedRate: number,
): Map<string, [to: IVec2]> {
  const line = shapeMap[lineId] as LineShape;
  const movingTargetIdSet = new Set(selectedShapeIds);
  const allTargetIdSet = new Set(movingTargetIdSet);
  const fixedTargetIdSet = new Set<string>();
  toList(shapeMap).forEach((s) => {
    if (s.attachment?.id === line.id && !movingTargetIdSet.has(s.id)) {
      allTargetIdSet.add(s.id);
      fixedTargetIdSet.add(s.id);
    }
  });

  const indexShape = shapeMap[indexShapeId];
  const selectedShapes = selectedShapeIds.map((id) => shapeMap[id]);
  const [attachedList, otherList] = splitList(
    selectedShapes.filter((s) => s.id !== indexShapeId),
    (s) => s.attachment?.id === line.id,
  );

  const attachInfoMap = new Map<string, [to: IVec2]>();

  attachedList.sort((a, b) => a.attachment!.to.x - b.attachment!.to.x);
  let lastRate = attachedRate;
  attachedList.forEach((s) => {
    const v = s.attachment!.to.x - indexShape.attachment!.to.x;
    const rate = clamp(0, 1, attachedRate + v);
    attachInfoMap.set(s.id, [{ x: rate, y: 0 }]);
    lastRate = rate;
  });

  if (otherList.length > 0) {
    let nextRate = 1;
    fixedTargetIdSet.forEach((id) => {
      const s = shapeMap[id];
      const rate = s.attachment!.to.x;
      if (lastRate < rate) {
        nextRate = Math.min(rate, nextRate);
      }
    });

    const toLerpFn = (t: number) => lerpPoint({ x: lastRate, y: 0 }, { x: nextRate, y: 0 }, t);
    const step = 1 / (otherList.length + (fixedTargetIdSet.size > 0 ? 1 : 0));
    otherList.forEach((s, i) => {
      const to = toLerpFn(step * (i + 1));
      attachInfoMap.set(s.id, [to]);
    });
  }

  return attachInfoMap;
}
