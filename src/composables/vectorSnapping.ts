import { add, getDistance, getNorm, getPedal, isParallel, isSame, IVec2, MINVALUE, sub } from "okageo";
import { Shape, StyleScheme } from "../models";
import { getIntersectedOutlines, GetShapeStruct } from "../shapes";
import { ShapeSnappingLines } from "../shapes/core";
import { extendSegment, getCrossLineAndLine, ISegment, TAU } from "../utils/geometry";
import { pickMinItem } from "../utils/commons";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { applyPath } from "../utils/renderer";
import { applyFillStyle } from "../utils/fillStyle";

const SNAP_THRESHOLD = 10;

interface Option {
  origin: IVec2;
  vector: IVec2;
  snappableShapes: Shape[];
  gridSnapping?: ShapeSnappingLines;
  getShapeStruct: GetShapeStruct;
  snappableOrigin?: boolean;
}

type snappedTarget = "shape" | "grid" | "origin";
export type VectorSnappingResult = { p: IVec2; guidLines?: ISegment[]; snapped?: snappedTarget };

export function newVectorSnapping(option: Option) {
  const isZeroVector = isSame(option.vector, { x: 0, y: 0 });
  const segment: ISegment = [option.origin, add(option.origin, option.vector)];
  const isHorizontal = isParallel(option.vector, { x: 1, y: 0 });
  const isVertical = isParallel(option.vector, { x: 0, y: 1 });
  const reversedSnappableShapes = option.snappableShapes.concat().reverse();

  function hitTest(point: IVec2, scale: number): VectorSnappingResult {
    if (isZeroVector) return { p: option.origin };

    const threshold = SNAP_THRESHOLD * scale;
    const pedal = getPedal(point, segment);
    if (option.snappableOrigin && getDistance(option.origin, pedal) < threshold)
      return { p: option.origin, snapped: "origin" };

    const rawSegment: ISegment = [segment[0], pedal];
    const norm = getNorm(sub(rawSegment[0], rawSegment[1]));
    if (norm < MINVALUE) return { p: pedal };

    const extendedGuideLine = extendSegment(rawSegment, 1 + threshold / norm);

    // Try snapping to shapes' outline
    {
      let outline: { p: IVec2; d: number; shape: Shape; guideLine?: ISegment } | undefined;
      reversedSnappableShapes.some((shape) => {
        const candidates = getIntersectedOutlines(
          option.getShapeStruct,
          shape,
          extendedGuideLine[0],
          extendedGuideLine[1],
        );
        const intersection = candidates?.find((c) => getDistance(c, pedal) <= threshold);
        if (intersection) {
          const d = getDistance(intersection, pedal);
          outline = { p: intersection, d, shape };
          return true;
        }
      });
      if (outline) return { p: outline.p, snapped: "shape" };
    }

    if (option.gridSnapping) {
      const closestHGrid = !isHorizontal
        ? pickMinItem(option.gridSnapping.h, (hLine) => Math.abs(hLine[0].y - pedal.y))
        : undefined;
      const closestVGrid = !isVertical
        ? pickMinItem(option.gridSnapping.v, (vLine) => Math.abs(vLine[0].x - pedal.x))
        : undefined;

      const intersectionH = closestHGrid ? getCrossLineAndLine(rawSegment, closestHGrid) : undefined;
      const intersectionV = closestVGrid ? getCrossLineAndLine(rawSegment, closestVGrid) : undefined;
      const dH = intersectionH ? getDistance(pedal, intersectionH) : Infinity;
      const dV = intersectionV ? getDistance(pedal, intersectionV) : Infinity;

      const candidateH = dH < threshold ? intersectionH : undefined;
      const candidateV = dV < threshold ? intersectionV : undefined;

      if (candidateH && candidateV) {
        if (isSame(candidateH, candidateV)) {
          return { p: intersectionH!, guidLines: [closestHGrid!, closestVGrid!], snapped: "grid" };
        }

        if (dH <= dV) {
          return { p: intersectionH!, guidLines: [closestHGrid!], snapped: "grid" };
        } else {
          return { p: intersectionV!, guidLines: [closestVGrid!], snapped: "grid" };
        }
      } else if (candidateH) {
        return { p: intersectionH!, guidLines: [closestHGrid!], snapped: "grid" };
      } else if (candidateV) {
        return { p: intersectionV!, guidLines: [closestVGrid!], snapped: "grid" };
      }
    }

    return { p: pedal };
  }

  return { hitTest };
}
export type VectorSnapping = ReturnType<typeof newVectorSnapping>;

export function renderVectorSnappingResult(
  ctx: CanvasRenderingContext2D,
  option: { result: VectorSnappingResult; scale: number; style: StyleScheme },
) {
  if (option.result.guidLines) {
    applyStrokeStyle(ctx, { color: option.style.selectionSecondaly, width: 2 * option.scale });
    option.result.guidLines.forEach((guide) => {
      ctx.beginPath();
      applyPath(ctx, guide);
      ctx.stroke();
    });
  }

  if (option.result.snapped) {
    applyFillStyle(ctx, { color: option.style.selectionSecondaly });
    const size = 5 * option.scale;
    ctx.beginPath();
    ctx.arc(option.result.p.x, option.result.p.y, size, 0, TAU);
    ctx.fill();
  }
}
