import {
  clamp,
  getCenter,
  getDistanceSq,
  getOuterRectangle,
  getRadian,
  getRectCenter,
  isSame,
  IVec2,
  lerpPoint,
  rotate,
} from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import { isLineShape, LineShape } from "../shapes/line";
import { getLineEdgeInfo } from "../shapes/utils/line";
import { ShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { fillArray, isObjectEmpty, pickMinItem, slideSubArray, splitList, toList } from "../utils/commons";
import { getRelativePointWithinRect, getRelativeRateWithinRect, getRotateFn } from "../utils/geometry";

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

        let nextRotation = nextAttached.rotation;
        if (nextAttached.attachment.rotationType === "relative") {
          const d = 0.001;
          const [ta, tb] = d < t ? [nextLineLerpFn(t - d), toP] : [toP, nextLineLerpFn(t + d)];
          const baseRotation = getRadian(tb, ta);
          nextRotation = nextAttached.attachment.rotation + baseRotation;
        }

        const patch =
          patchByMoveToAttachedPoint(
            shapeComposite,
            { ...nextAttached, rotation: nextRotation },
            nextAttached.attachment.anchor,
            toP,
          ) ?? {};

        if (nextAttached.rotation !== nextRotation) {
          patch.rotation = nextRotation;
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
  const anchorP = getNextAttachmentAnchorPoint(shapeComposite, shape, anchor);
  return shapeComposite.transformShape(shape, [1, 0, 0, 1, attachedPoint.x - anchorP.x, attachedPoint.y - anchorP.y]);
}

export function getAttachmentAnchorPoint(shapeComposite: ShapeComposite, shape: Shape): IVec2 {
  return getNextAttachmentAnchorPoint(shapeComposite, shape, shape.attachment?.anchor);
}

export function getNextAttachmentAnchorPoint(shapeComposite: ShapeComposite, shape: Shape, rate?: IVec2): IVec2 {
  const localRectPath = shapeComposite.getLocalRectPolygon(shape);
  const c = getCenter(localRectPath[0], localRectPath[2]);
  if (!rate) return c;

  const rotateFn = getRotateFn(shape.rotation, c);
  const derotatedLocalRectPath = localRectPath.map((p) => rotateFn(p, true));
  const derotatedRect = getOuterRectangle([derotatedLocalRectPath]);
  const derotatedAnchor = getRelativePointWithinRect(derotatedRect, rate);
  return rotateFn(derotatedAnchor);
}

export function getNextAttachmentAnchor(shapeComposite: ShapeComposite, shape: Shape, point: IVec2): IVec2 {
  const localSpace = shapeComposite.getLocalSpace(shape);
  const localPoint = rotate(point, -localSpace[1], getRectCenter(localSpace[0]));
  return getRelativeRateWithinRect(localSpace[0], localPoint, true);
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

export function getEvenlySpacedLineAttachment(
  shapeMap: { [id: string]: Shape },
  lineId: string,
  selectedShapeIds: string[],
  indexShapeId: string,
  anchorP: IVec2,
  edgeInfo: ReturnType<typeof getLineEdgeInfo>,
): {
  attachInfoMap: Map<string, [to: IVec2]>;
  attachedPoint: IVec2;
} {
  const line = shapeMap[lineId] as LineShape;
  const movingTargetIdSet = new Set(selectedShapeIds);
  const allTargetIdSet = new Set(movingTargetIdSet);
  toList(shapeMap).forEach((s) => {
    if (s.attachment?.id === line.id && !movingTargetIdSet.has(s.id)) {
      allTargetIdSet.add(s.id);
    }
  });

  const closed = isSame(line.p, line.q);
  const splitSize = closed ? allTargetIdSet.size : Math.max(1, allTargetIdSet.size - 1);
  const points = fillArray(allTargetIdSet.size, 0).map<[IVec2, rate: number, index: number, distanceSq: number]>(
    (_, i) => {
      const t = i / splitSize;
      const p = edgeInfo.lerpFn(t);
      const dd = getDistanceSq(p, anchorP);
      return [p, t, i, dd];
    },
  );
  const closestSplitInfo = pickMinItem(points, (v) => v[3])!;

  // Push newly attached ones to the tail.
  const sortedAllTargets = Array.from(allTargetIdSet)
    .map((id) => shapeMap[id])
    .sort((a, b) => (a.attachment?.to.x ?? 1) - (b.attachment?.to.x ?? 1));
  const sortedMovingTargets = sortedAllTargets.filter(({ id }) => movingTargetIdSet.has(id));
  const baseIndexWithinMovingShapes = sortedMovingTargets.findIndex(({ id }) => id === indexShapeId);

  const movingIndexList: number[] = [];
  sortedAllTargets.forEach((s, i) => {
    if (movingTargetIdSet.has(s.id)) {
      movingIndexList.push(i);
    }
  });
  const nextAllTargets = slideSubArray(
    sortedAllTargets,
    [Math.min(...movingIndexList), movingIndexList.length],
    closestSplitInfo[2] - baseIndexWithinMovingShapes,
  );
  const attachInfoMap = new Map<string, [to: IVec2]>(nextAllTargets.map((s, i) => [s.id, [{ x: points[i][1], y: 0 }]]));

  return { attachInfoMap, attachedPoint: closestSplitInfo[0] };
}
