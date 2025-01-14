import {
  add,
  AffineMatrix,
  clamp,
  getDistance,
  getDistanceSq,
  getRectCenter,
  IRectangle,
  isSame,
  IVec2,
  lerpPoint,
  MINVALUE,
  rotate,
  sub,
} from "okageo";
import { EntityPatchInfo, Shape, StyleScheme } from "../models";
import { isLineShape, LineShape } from "../shapes/line";
import { getIntersectionsBetweenLineShapeAndLine, getLineEdgeInfo } from "../shapes/utils/line";
import { getClosestPointOnPolyline, PolylineEdgeInfo } from "../utils/path";
import { ShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import {
  fillArray,
  mapEach,
  mapReduce,
  patchPipe,
  pickMinItem,
  slideSubArray,
  splitList,
  toList,
  toMap,
} from "../utils/commons";
import {
  getClosestLineToRectFeaturePoints,
  getD2,
  getPointLerpSlope,
  getRelativePointWithinRect,
  getRelativeRateWithinRect,
  getRotateFn,
  getRotationAffine,
  ISegment,
  TAU,
} from "../utils/geometry";
import { getCurveLinePatch } from "./curveLineHandler";
import { applyFillStyle } from "../utils/fillStyle";
import {
  filterSnappingTargetsBySecondGuideline,
  getSecondGuidelineCandidateInfo,
  SNAP_THRESHOLD,
  SnappingResult,
} from "./shapeSnapping";
import { CanvasCTX } from "../utils/types";

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
    const attachedMap = getUpdatedAttachedMap(shapeComposite, updatedMap);

    const ret: { [id: string]: Partial<Shape> } = {};
    attachedMap.forEach((attachedIdSet, lineId) => {
      if (attachedIdSet.size === 0) return;

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
        const shape = shapeMap[attachedId];
        const nextAttached = { ...shape, ...updatedMap[attachedId] };
        if (!shapeComposite.canAttach(nextAttached)) {
          if (shape.attachment) {
            ret[attachedId] = { attachment: undefined };
          }
          return;
        }

        const nextAttachment = nextAttached.attachment;
        if (!nextAttachment) return;

        const t = nextAttachment.to.x;
        const toP = nextLineLerpFn(t);

        let nextRotation = nextAttached.rotation;
        if (nextAttachment.rotationType === "relative") {
          const baseRotation = getPointLerpSlope(nextLineLerpFn, t);
          nextRotation = nextAttachment.rotation + baseRotation;
        }

        const allTargetShapes = shapeComposite.getAllTransformTargets([attachedId]);

        const patch = patchPipe(
          [
            (src) => {
              // Apply next rotation at first.
              const rotateAffine = getRotationAffine(
                nextRotation - shape.rotation,
                getRectCenter(shapeComposite.getWrapperRect(shape)),
              );
              return mapReduce(src, (s) => shapeComposite.transformShape(s, rotateAffine));
            },
            (src, update) => {
              // Derive translation affine based on the anchors of rotated shapes.
              const rotatedShapeComposite = shapeComposite.getSubShapeComposite([attachedId], update);
              const translateAffine = getAffineByMoveToAttachedPoint(
                rotatedShapeComposite,
                rotatedShapeComposite.mergedShapeMap[attachedId],
                nextAttachment.anchor,
                toP,
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
 * Returns Map<line id, Set<attached shape id>>
 */
function getUpdatedAttachedMap(
  shapeComposite: ShapeComposite,
  updatedMap: { [id: string]: Partial<Shape> },
): Map<string, Set<string>> {
  const shapeMap = shapeComposite.shapeMap;
  const targetLineIdSet = new Set(Object.keys(updatedMap).filter((id) => shapeMap[id] && isLineShape(shapeMap[id])));
  const attachedMap = new Map<string, Set<string>>();

  mapEach(shapeMap, (s, id) => {
    const lineId = s.attachment?.id ?? updatedMap[id]?.attachment?.id;
    if (!lineId || !targetLineIdSet.has(lineId)) return;

    const idSet = attachedMap.get(lineId);
    if (idSet) {
      idSet.add(s.id);
    } else {
      attachedMap.set(lineId, new Set([s.id]));
    }
  });

  mapEach(updatedMap, (patch, id) => {
    if (targetLineIdSet.has(id)) return;

    const s = { ...shapeMap[id], ...patch };
    if (!s.attachment) return;

    const lineId = s.attachment.id;
    if (targetLineIdSet.has(lineId)) return;

    const idSet = attachedMap.get(lineId);
    if (idSet) {
      idSet.add(s.id);
    } else {
      attachedMap.set(lineId, new Set([s.id]));
    }
  });

  return attachedMap;
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

export function getAffineByMoveToAttachedPoint(
  shapeComposite: ShapeComposite,
  shape: Shape,
  anchor: IVec2,
  attachedPoint: IVec2,
): AffineMatrix {
  const anchorP = getNextAttachmentAnchorPoint(shapeComposite, shape, anchor);
  return [1, 0, 0, 1, attachedPoint.x - anchorP.x, attachedPoint.y - anchorP.y];
}

export function getAttachmentAnchorPoint(shapeComposite: ShapeComposite, shape: Shape): IVec2 {
  return getNextAttachmentAnchorPoint(shapeComposite, shape, shape.attachment?.anchor);
}

export function getNextAttachmentAnchorPoint(shapeComposite: ShapeComposite, shape: Shape, rate?: IVec2): IVec2 {
  const [localRect, rotation] = shapeComposite.getLocalSpace(shape);
  const c = getRectCenter(localRect);
  if (!rate) return c;

  const rotateFn = getRotateFn(rotation, c);
  const localAnchor = getRelativePointWithinRect(localRect, rate);
  return rotateFn(localAnchor);
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

export type PreserveAttachmentHandler = {
  setActive(val: boolean): void;
  getPatch(linePatch: Partial<LineShape>): { [id: string]: Partial<Shape> } | undefined;
  render(renderCtx: CanvasCTX, style: StyleScheme, scale: number, update: { [id: string]: Partial<Shape> }): void;
  hasAttachment: boolean;
};

export function newPreserveAttachmentHandler({
  shapeComposite,
  lineId,
}: {
  shapeComposite: ShapeComposite;
  lineId: string;
}): PreserveAttachmentHandler {
  let active = false;

  const anchorMap = new Map<string, IVec2>();
  shapeComposite.shapes.filter((s) => {
    if (s.attachment?.id !== lineId) return;

    const anchorP = getAttachmentAnchorPoint(shapeComposite, s);
    anchorMap.set(s.id, anchorP);
  });
  const hasAttachment = anchorMap.size > 0;

  function setActive(val: boolean): void {
    active = val;
  }

  function getPatch(linePatch: Partial<LineShape>): { [id: string]: Partial<Shape> } | undefined {
    if (!active) return;
    const srcLine = shapeComposite.shapeMap[lineId];
    if (!srcLine) return;

    const curvePatch = getCurveLinePatch(shapeComposite, { update: { [lineId]: linePatch } })[lineId];
    const latestLine = { ...srcLine, ...linePatch, ...curvePatch } as LineShape;
    const edgeInfo = getLineEdgeInfo(latestLine);
    const updateByAlt: { [id: string]: Partial<Shape> } = {};
    let changed = false;
    anchorMap.forEach((anchorP, id) => {
      const s = shapeComposite.shapeMap[id];
      if (!s?.attachment) return;

      changed = true;
      const closestInfo = getClosestPointOnPolyline(edgeInfo, anchorP, MINVALUE);
      if (closestInfo) {
        updateByAlt[id] = { attachment: { ...s.attachment, to: { x: closestInfo[1], y: 0 } } };
      } else {
        updateByAlt[id] = { attachment: undefined };
      }
    });

    return changed ? updateByAlt : undefined;
  }

  function render(
    renderCtx: CanvasCTX,
    style: StyleScheme,
    scale: number,
    update: { [id: string]: Partial<Shape> },
  ): void {
    if (!active) return;

    applyFillStyle(renderCtx, { color: style.selectionSecondaly });
    const size = 6 * scale;
    anchorMap.forEach((anchorP, id) => {
      const s = shapeComposite.shapeMap[id];
      if (!s) return;
      const latest = { ...s, ...update[id] };
      if (!latest.attachment) return;

      renderCtx.beginPath();
      renderCtx.arc(anchorP.x, anchorP.y, size, 0, TAU);
      renderCtx.fill();
    });
  }

  return { setActive, getPatch, render, hasAttachment };
}

export function snapRectWithLineAttachment({
  line,
  edgeInfo,
  snappingResult,
  movingRect,
  movingRectAnchorRate,
  movingRectAnchor,
  scale,
}: {
  line: LineShape;
  edgeInfo: PolylineEdgeInfo;
  snappingResult: SnappingResult;
  movingRect: IRectangle;
  movingRectAnchorRate: number;
  movingRectAnchor: IVec2;
  scale: number;
}):
  | {
      snappingResult: SnappingResult;
      lineAnchorRate: number;
      lineAnchor: IVec2;
    }
  | undefined {
  // Get slope at the latest anchor point on the line.
  // Use this slope as first guideline to get second guideline candidates.
  const slopeV = rotate({ x: 1, y: 0 }, getPointLerpSlope(edgeInfo.lerpFn, movingRectAnchorRate));
  const candidateInfo = getSecondGuidelineCandidateInfo(snappingResult, slopeV);

  // Get currently snapped anchor that isn't on the line.
  const snappedAnchor = add(movingRectAnchor, snappingResult.diff);
  // Get the closest candidate to a feature point of moving rect as second guideline.
  const secondGuideline = getClosestLineToRectFeaturePoints(movingRect, candidateInfo.candidates);
  if (!secondGuideline) return;

  // Slide second guideline to the snapped anchor.
  const secondGuidelineAtSnappedAnchor: ISegment = [
    snappedAnchor,
    add(sub(secondGuideline[1], secondGuideline[0]), snappedAnchor),
  ];
  // Get intersections between the line and adjusted second guideline.
  // This intersections are on the line and keep second guideline valid.
  const intersections = getIntersectionsBetweenLineShapeAndLine(line, secondGuidelineAtSnappedAnchor);
  const nextLineAnchorP = pickMinItem(intersections, (p) => getD2(sub(p, movingRectAnchor)));
  if (!nextLineAnchorP || getDistance(nextLineAnchorP, movingRectAnchor) >= SNAP_THRESHOLD * scale) return;

  // The anchor point is determined but stlll need to get its rate on the line.
  const closestInfo = getClosestPointOnPolyline(edgeInfo, nextLineAnchorP, Infinity);
  if (!closestInfo) return;

  return {
    snappingResult: {
      diff: snappingResult.diff,
      ...filterSnappingTargetsBySecondGuideline(candidateInfo, secondGuideline),
    },
    lineAnchorRate: closestInfo[1],
    lineAnchor: nextLineAnchorP,
  };
}
