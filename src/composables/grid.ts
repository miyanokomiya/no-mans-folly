import { getDistance, getInner, IRectangle, isParallel, isSame, IVec2, sub } from "okageo";
import { getCrossLineAndLine, ISegment, snapNumber, snapNumberCeil } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import { COLORS } from "../utils/color";
import { ShapeSnappingLines } from "../shapes/core";
import { pickMinItem } from "../utils/commons";
import { CanvasCTX } from "../utils/types";

export const GRID_DEFAULT_COLOR = "rgba(40,40,40,1)";
const GRID_LABEL_STEP_SIZE = 100;

interface Option {
  size: number;
  range: IRectangle;
  disabled?: boolean;
}

export function newGrid({ size, range, disabled }: Option) {
  const countV = disabled ? 0 : Math.ceil(range.width / size);
  const countH = disabled ? 0 : Math.ceil(range.height / size);

  const baseX = snapNumberCeil(range.x, size);
  const segmentsV: ISegment[] = [...Array(countV)].map((_, i) => {
    const x = baseX + i * size;
    return [
      { x, y: range.y },
      { x, y: range.y + range.height },
    ];
  });

  const baseY = snapNumberCeil(range.y, size);
  const segmentsH: ISegment[] = [...Array(countH)].map((_, i) => {
    const y = baseY + i * size;
    return [
      { x: range.x, y },
      { x: range.x + range.width, y },
    ];
  });

  function pickClosestGridLineVAtPoint(point: IVec2): ISegment {
    const x = snapNumber(point.x, size);
    return [
      { x, y: range.y },
      { x, y: range.y + range.height },
    ];
  }

  function pickClosestGridLineHAtPoint(point: IVec2): ISegment {
    const y = snapNumber(point.y, size);
    return [
      { x: range.x, y },
      { x: range.x + range.width, y },
    ];
  }

  function getSnappingLines(): ShapeSnappingLines {
    return {
      linesByRotation: new Map([
        [Math.PI / 2, segmentsV],
        [0, segmentsH],
      ]),
    };
  }

  function renderAxisLabels(ctx: CanvasCTX, scale = 1) {
    if (disabled) return;

    ctx.save();

    applyFillStyle(ctx, { color: COLORS.BLACK });
    ctx.globalAlpha = 0.5;
    ctx.font = `${14 * scale}px Arial`;

    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const labelVY = range.y + range.height - 4 * scale;
    forEachGridLabel(baseX, size, range.width, scale, (v) => {
      ctx.fillText(`${v}`, v, labelVY);
    });

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const labelHX = range.x + 4 * scale;
    forEachGridLabel(baseY, size, range.height, scale, (v) => {
      ctx.fillText(`${v}`, labelHX, v);
    });

    ctx.restore();
  }

  return {
    pickClosestGridLineHAtPoint,
    pickClosestGridLineVAtPoint,
    getSnappingLines,
    renderAxisLabels,
    disabled,
    size,
    range,
  };
}
export type Grid = ReturnType<typeof newGrid>;

function forEachGridLabel(base: number, size: number, viewSize: number, scale: number, fn: (v: number) => void) {
  const count = Math.ceil(viewSize / size);
  const maxCount = Math.round(viewSize / GRID_LABEL_STEP_SIZE / scale);
  const step = Math.max(1, Math.round(count / maxCount));
  const shift = -(base / size) % step;
  for (let i = 0; i < count; i += step) {
    fn(base + (i + shift) * size);
  }
}

const GRID_MIN_VIEW_SIZE = 20;

export function getGridSize(baseSize: number, scale: number): number {
  const viewSize = baseSize / scale;
  if (viewSize >= GRID_MIN_VIEW_SIZE) return baseSize;

  const adjustedSize = snapNumber(GRID_MIN_VIEW_SIZE * scale, baseSize);
  return adjustedSize;
}

/**
 * Returns the unit normal vector perpendicular to a line at the given rotation.
 * Uses exact values for the standard angles 0 and Math.PI / 2.
 */
function getRotationNormal(rotation: number): IVec2 {
  if (rotation === 0) return { x: 0, y: 1 };
  if (rotation === Math.PI / 2) return { x: -1, y: 0 };
  return { x: -Math.sin(rotation), y: Math.cos(rotation) };
}

export function snapVectorToGrid(
  gridSnapping: ShapeSnappingLines,
  origin: IVec2,
  moving: IVec2,
  threshold: number,
):
  | {
      p: IVec2;
      lines: ISegment[]; // snapped grid lines
    }
  | undefined {
  const seg: ISegment = [origin, moving];
  const vec = sub(moving, origin);

  // For each rotation, find the closest grid line (skip if vec is parallel to that rotation's lines)
  const candidates: { p: IVec2; d: number; line: ISegment }[] = [];
  for (const [rotation, lines] of gridSnapping.linesByRotation) {
    const lineDir = { x: Math.cos(rotation), y: Math.sin(rotation) };
    if (isParallel(vec, lineDir)) continue;

    const normal = getRotationNormal(rotation);
    const closestLine = pickMinItem(lines, (l) => {
      return Math.abs(getInner(l[0], normal) - getInner(moving, normal));
    });
    if (!closestLine) continue;

    const intersection = getCrossLineAndLine(seg, closestLine);
    if (!intersection) continue;

    const d = getDistance(moving, intersection);
    candidates.push({ p: intersection, d, line: closestLine });
  }

  if (candidates.length === 0) return;

  // Pick the closest intersection within threshold
  const best = pickMinItem(
    candidates.filter((c) => c.d < threshold),
    (c) => c.d,
  );
  if (!best) return;

  // If multiple candidates are equally close (e.g. snapping to intersection of two lines), include all
  const lines = candidates.filter((c) => c.d < threshold && isSame(c.p, best.p)).map((c) => c.line);

  return { p: best.p, lines };
}

export function pickClosestGridLineAtPoint(
  gridSnapping: ShapeSnappingLines,
  point: IVec2,
  threshold: number,
):
  | {
      p: IVec2; // the pedal on the closest grid line
      line: ISegment; // the closest grid line
      rotation: number;
    }
  | undefined {
  let best: { p: IVec2; line: ISegment; rotation: number; d: number } | undefined;

  for (const [rotation, lines] of gridSnapping.linesByRotation) {
    const normal = getRotationNormal(rotation);
    const closest = pickMinItem(
      lines.map<[ISegment, number]>((seg) => [seg, Math.abs(getInner(seg[0], normal) - getInner(point, normal))]),
      ([, d]) => d,
    );
    if (!closest || closest[1] >= threshold) continue;

    if (!best || closest[1] < best.d) {
      const diff = getInner(closest[0][0], normal) - getInner(point, normal);
      const pedal = { x: point.x + diff * normal.x, y: point.y + diff * normal.y };
      best = { p: pedal, line: closest[0], rotation, d: closest[1] };
    }
  }

  if (!best) return;
  return { p: best.p, line: best.line, rotation: best.rotation };
}
