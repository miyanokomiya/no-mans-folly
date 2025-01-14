import { add, getDistance, getNorm, getPedal, isSame, IVec2, MINVALUE, sub } from "okageo";
import { Shape, StyleScheme } from "../models";
import { getIntersectedOutlines, GetShapeStruct } from "../shapes";
import { ShapeSnappingLines } from "../shapes/core";
import { extendSegment, ISegment, TAU } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { applyPath } from "../utils/renderer";
import { applyFillStyle } from "../utils/fillStyle";
import { snapVectorToGrid } from "./grid";
import { CanvasCTX } from "../utils/types";

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
      const gridResult = snapVectorToGrid(option.gridSnapping, rawSegment[0], rawSegment[1], threshold);
      if (gridResult) {
        return { p: gridResult.p, guidLines: gridResult.lines, snapped: "grid" };
      }
    }

    return { p: pedal };
  }

  return { hitTest };
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
