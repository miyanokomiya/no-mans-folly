import { getSegments, ISegment, normalizeRadian, snapNumberCeil, snapNumberFloor } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyPath, renderOutlinedCircle, renderValueLabel } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { add, getDistance, getRadian, isSame, IVec2, multi, rotate } from "okageo";
import { ShapeComposite } from "../shapeComposite";
import { getLinePath, LineShape, patchVertex } from "../../shapes/line";

const ANCHOR_THRESHOLD = 6;
const SCALE_SIZES = [10, 20, 30];

interface HitResult {
  type: "switch-origin";
}

interface Option {
  segment: ISegment;
  segmentSrc: ISegment;
  originRadian: number;
  segmentRadian: number;
}

export const newLineSegmentEditingHandler = defineShapeHandler<HitResult, Option>((option) => {
  const segment = option.segment;
  const [origin, other] = segment;
  const totalSize = getDistance(origin, other);
  const originV = rotate({ x: 1, y: 0 }, option.originRadian);
  const radian = option.segmentRadian;

  return {
    hitTest(p, scale) {
      const threshold = ANCHOR_THRESHOLD * scale;
      if (getDistance(p, other) <= threshold) {
        return { type: "switch-origin" };
      }
      return undefined;
    },
    render(ctx, style, scale, hitResult) {
      applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
      ctx.beginPath();
      applyPath(ctx, segment);
      ctx.stroke();

      const protractorRate = 0.5;
      const scaleSizes = SCALE_SIZES.map((v) => v * scale);
      {
        const normalV = rotate({ x: 1, y: 0 }, radian + Math.PI / 2);
        const long = multi(normalV, scaleSizes[2]);
        const middle = multi(normalV, scaleSizes[1]);
        const short = multi(normalV, scaleSizes[0]);
        const step = scale < 0.1 ? 1 : scale < 4 ? 10 : 100;
        const longStep = 10;
        const stepV = rotate({ x: 1, y: 0 }, radian);
        const baseCount = Math.round(totalSize / step);
        const protractorIndex = baseCount * protractorRate;
        const segs = [...Array(baseCount + 11)].map((_, i) => {
          const p = add(origin, multi(stepV, step * i));
          return [p, add(p, i % longStep === 0 ? long : i % (longStep / 2) === 0 ? middle : short)];
        });
        applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 2 * scale });
        ctx.beginPath();
        segs.forEach((seg, i) => {
          if (0 < i && protractorIndex - 1 < i && i < protractorIndex + 2) return;
          applyPath(ctx, seg);
        });
        ctx.stroke();
        segs.forEach((seg, i) => {
          if (0 < i && protractorIndex - 1 < i && i < protractorIndex + 2) return;
          if (i % longStep !== 0) return;
          renderValueLabel(ctx, step * i, seg[1], 0, scale, true);
        });
      }

      {
        const originSeg = [add(origin, multi(originV, totalSize * 0.7)), origin];
        applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 2 * scale });
        ctx.beginPath();
        applyPath(ctx, originSeg);
        ctx.stroke();

        const radianRange = Math.PI * 0.51;
        const radius = totalSize * protractorRate;
        applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 2 * scale });
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, radius, radian - radianRange / 2, radian + radianRange / 2);
        ctx.stroke();

        const step = 5;
        const base = snapNumberCeil(((radian - option.originRadian - radianRange / 2) * 180) / Math.PI, step);
        const to = snapNumberFloor(((radian - option.originRadian + radianRange / 2) * 180) / Math.PI, step);
        const count = (to - base) / step + 1;

        const info = [...Array(count)].map<[ISegment, number]>((_, i) => {
          const a = base + i * step;
          const r = (a * Math.PI) / 180;
          const v = rotate({ x: 1, y: 0 }, r + option.originRadian);
          const l = a % 45 === 0 ? scaleSizes[2] : a % 15 === 0 ? scaleSizes[1] : scaleSizes[0];
          const p = add(origin, multi(v, radius));
          return [[p, add(p, multi(v, l))], a];
        });
        applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 1 * scale });
        ctx.beginPath();
        info.forEach(([seg]) => {
          applyPath(ctx, seg);
        });
        ctx.stroke();
        info.forEach(([seg, a]) => {
          if (a % 15 !== 0) return;
          const na = (normalizeRadian((a * Math.PI) / 180) * 180) / Math.PI;
          renderValueLabel(ctx, Math.round(na), seg[1], 0, scale, true);
        });
        if (!info.some(([, a]) => a === 0)) {
          renderValueLabel(ctx, 0, add(origin, multi(originV, radius + 30 * scale)), 0, scale, true);
        }
      }

      const threshold = ANCHOR_THRESHOLD * scale;
      renderOutlinedCircle(ctx, origin, threshold, style.selectionPrimary);
      renderOutlinedCircle(
        ctx,
        other,
        threshold,
        hitResult?.type === "switch-origin" ? style.selectionSecondaly : style.transformAnchor,
      );
    },
    isSameHitResult(a, b) {
      return a?.type === b?.type;
    },
  };
});
export type LineSegmentEditingHandler = ReturnType<typeof newLineSegmentEditingHandler>;

export function getSegmentOriginRadian(
  vertices: IVec2[],
  index: number,
  originIndex: 0 | 1,
  relativeAngle = false,
): number {
  if (!relativeAngle) return 0;

  const segment = getTargetSegment(vertices, index, originIndex);
  const relativeOrigin = getSegmentPreviousPoint(vertices, index, originIndex);
  if (!relativeOrigin) return 0;

  return getRadian(relativeOrigin, segment[0]);
}

function getSegmentPreviousPoint(vertices: IVec2[], index: number, originIndex: 0 | 1): IVec2 | undefined {
  return vertices.at(Math.max(0, index + (originIndex === 1 ? 2 : -1)));
}

export function getTargetSegment(vertices: IVec2[], index: number, originIndex: 0 | 1): ISegment {
  const segmentSrc = getSegments(vertices)[index];
  return originIndex === 1 ? [segmentSrc[1], segmentSrc[0]] : segmentSrc;
}

/**
 * Return source radian when the latest one is zero sized.
 */
export function getSegmentRadian(segmentSrc: ISegment, segmentLatest: ISegment): number {
  const zeroSized = isSame(segmentLatest[0], segmentLatest[1]);
  return zeroSized ? getRadian(segmentSrc[1], segmentSrc[0]) : getRadian(segmentLatest[1], segmentLatest[0]);
}

export function patchLineSegment(
  shapeComposite: ShapeComposite,
  id: string,
  index: number,
  originIndex: 0 | 1,
  segmentRadian: number,
  size: number | undefined,
  radian: number | undefined,
  relativeAngle: boolean,
): Partial<LineShape> | undefined {
  const src = shapeComposite.shapeMap[id] as LineShape;
  const verticesSrc = getLinePath(src);
  const segmentSrc = getTargetSegment(verticesSrc, index, originIndex);

  if (size !== undefined) {
    const p = add(multi(rotate({ x: 1, y: 0 }, segmentRadian), size), segmentSrc[0]);
    return patchVertex(src, index + 1 - originIndex, p, undefined);
  }
  if (radian !== undefined) {
    const latestLineShape = shapeComposite.mergedShapeMap[id] as LineShape;
    const segmentLatest = getTargetSegment(getLinePath(latestLineShape), index, originIndex);
    const originRadian = getSegmentOriginRadian(verticesSrc, index, originIndex, relativeAngle);
    const p = add(
      multi(rotate({ x: 1, y: 0 }, radian + originRadian), getDistance(segmentLatest[0], segmentLatest[1])),
      segmentSrc[0],
    );
    return patchVertex(src, index + 1 - originIndex, p, undefined);
  }
}
