import { add, getDistance, getNorm, getPedal, isOnLine, isSame, IVec2, MINVALUE, sub } from "okageo";
import { Shape, StyleScheme } from "../models";
import { getIntersectedOutlines, GetShapeStruct } from "../shapes";
import { ShapeSnappingLines } from "../shapes/core";
import { extendSegment, getD2, ISegment, TAU } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { applyPath } from "../utils/renderer";
import { applyFillStyle } from "../utils/fillStyle";
import { snapVectorToGrid } from "./grid";
import { CanvasCTX } from "../utils/types";
import { pickMinItem } from "../utils/commons";

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
export type VectorSnappingResult = { p: IVec2; v: IVec2; guidLines?: ISegment[]; snapped?: snappedTarget };

export function newVectorSnapping(option: Option) {
  const isZeroVector = isSame(option.vector, { x: 0, y: 0 });
  const segment: ISegment = [option.origin, add(option.origin, option.vector)];
  const reversedSnappableShapes = option.snappableShapes.concat().reverse();

  function hitTest(point: IVec2, scale: number): VectorSnappingResult {
    if (isZeroVector) return { p: option.origin, v: sub(option.origin, point) };

    const threshold = SNAP_THRESHOLD * scale;
    const pedal = getPedal(point, segment);
    if (option.snappableOrigin && getDistance(option.origin, pedal) < threshold)
      return { p: option.origin, v: sub(option.origin, point), snapped: "origin" };

    const rawSegment: ISegment = [segment[0], pedal];
    const norm = getNorm(sub(rawSegment[0], rawSegment[1]));
    if (norm < MINVALUE) return { p: pedal, v: sub(pedal, point) };

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
      if (outline)
        return { p: outline.p, v: sub(outline.p, point), snapped: "shape", guidLines: [[option.origin, outline.p]] };
    }

    if (option.gridSnapping) {
      const gridResult = snapVectorToGrid(option.gridSnapping, rawSegment[0], rawSegment[1], threshold);
      if (gridResult) {
        return {
          p: gridResult.p,
          v: sub(gridResult.p, point),
          guidLines: [...gridResult.lines, [option.origin, gridResult.p]],
          snapped: "grid",
        };
      }
    }

    return { p: pedal, v: sub(pedal, point), guidLines: [[option.origin, pedal]] };
  }

  return { hitTest, segment };
}
export type VectorSnapping = ReturnType<typeof newVectorSnapping>;

export function renderVectorSnappingResult(
  ctx: CanvasCTX,
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

interface VectorsSnappingOption {
  origins: IVec2[];
  vector: IVec2;
  snappableShapes: Shape[];
  gridSnapping?: ShapeSnappingLines;
  getShapeStruct: GetShapeStruct;
  snappableOrigin?: boolean;
}
export type VectorSnappingsResult = { v: IVec2; results: VectorSnappingResult[] };

export function newVectorsSnapping(option: VectorsSnappingOption) {
  const snappings = option.origins.map((origin) =>
    newVectorSnapping({
      ...option,
      origin,
    }),
  );

  function hitTest(points: IVec2[], scale: number): VectorSnappingsResult | undefined {
    const threshold = SNAP_THRESHOLD * scale;
    const allResults = points.map<[VectorSnappingResult, IVec2]>((point, i) => [
      snappings[i].hitTest(point, scale),
      point,
    ]);
    const allSnappedResultWithValue = allResults.map<[VectorSnappingResult, number]>(([r, p]) => [
      r,
      getD2(sub(r.p, p)),
    ]);
    // Prioritize the snapped results if any exists.
    let candidates = allSnappedResultWithValue.filter(([r]) => r.snapped);
    if (candidates.length === 0) {
      candidates = allSnappedResultWithValue;
    }

    const closestResult = pickMinItem(candidates, ([, d]) => d);
    if (!closestResult || closestResult[1] > threshold ** 2) return undefined;

    // Collect all the results that have the same snapping vector as the closest one.
    const closeResults: VectorSnappingResult[] = [];
    allSnappedResultWithValue.forEach(([r], i) => {
      // When the result has the same translation as the closest one, this snap is valid.
      if (isSame(r.v, closestResult[0].v)) {
        closeResults.push(r);
        return;
      }

      // When the snapped moving point is on the source guideline, the guideline is valid.
      const snapping = snappings[i];
      const p = points[i];
      const origin = option.origins[i];
      const snappedP = add(p, closestResult[0].v);
      if (isOnLine(snappedP, snapping.segment)) {
        closeResults.push({ p: snappedP, v: closestResult[0].v, guidLines: [[origin, snappedP]] });
        return;
      }
    });

    return { v: closestResult[0].v, results: closeResults };
  }

  return { hitTest };
}
