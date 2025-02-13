import { getDistance, IRectangle, isParallel, isSame, IVec2, sub } from "okageo";
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
    return { v: segmentsV, h: segmentsH };
  }

  function renderAxisLabels(ctx: CanvasCTX, scale = 1) {
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
  const isHorizontal = isParallel(vec, { x: 1, y: 0 });
  const isVertical = isParallel(vec, { x: 0, y: 1 });
  const closestHGrid = !isHorizontal
    ? pickMinItem(gridSnapping.h, (hLine) => Math.abs(hLine[0].y - moving.y))
    : undefined;
  const closestVGrid = !isVertical
    ? pickMinItem(gridSnapping.v, (vLine) => Math.abs(vLine[0].x - moving.x))
    : undefined;

  const intersectionH = closestHGrid ? getCrossLineAndLine(seg, closestHGrid) : undefined;
  const intersectionV = closestVGrid ? getCrossLineAndLine(seg, closestVGrid) : undefined;
  const dH = intersectionH ? getDistance(moving, intersectionH) : Infinity;
  const dV = intersectionV ? getDistance(moving, intersectionV) : Infinity;

  const candidateH = dH < threshold ? intersectionH : undefined;
  const candidateV = dV < threshold ? intersectionV : undefined;

  if (candidateH && candidateV) {
    if (isSame(candidateH, candidateV)) {
      return { p: candidateH, lines: [closestHGrid!, closestVGrid!] };
    }

    if (dH <= dV) {
      return { p: candidateH, lines: [closestHGrid!] };
    } else {
      return { p: candidateV, lines: [closestVGrid!] };
    }
  } else if (candidateH) {
    return { p: candidateH, lines: [closestHGrid!] };
  } else if (candidateV) {
    return { p: candidateV, lines: [closestVGrid!] };
  }
}

export function pickClosestGridLineAtPoint(
  gridSnapping: ShapeSnappingLines,
  point: IVec2,
  threshold: number,
):
  | {
      p: IVec2; // the pedal on the closest grid line
      line: ISegment; // the closest grid line
      type: "h" | "v";
    }
  | undefined {
  const gridH = pickMinItem(
    gridSnapping.h.map<[ISegment, number]>((seg) => [seg, Math.abs(point.y - seg[0].y)]),
    ([, v]) => v,
  );
  const gridV = pickMinItem(
    gridSnapping.v.map<[ISegment, number]>((seg) => [seg, Math.abs(point.x - seg[0].x)]),
    ([, v]) => v,
  );

  if (gridH && gridV) {
    if (gridH[1] < threshold && gridH[1] < gridV[1]) {
      return {
        p: { x: point.x, y: gridH[0][0].y },
        line: gridH[0],
        type: "h",
      };
    } else if (gridV[1] < threshold && gridV[1] < gridH[1]) {
      return {
        p: { x: gridV[0][0].x, y: point.y },
        line: gridV[0],
        type: "v",
      };
    }
  } else if (gridH && gridH[1] < threshold) {
    return {
      p: { x: point.x, y: gridH[0][0].y },
      line: gridH[0],
      type: "h",
    };
  } else if (gridV && gridV[1] < threshold) {
    return {
      p: { x: gridV[0][0].x, y: point.y },
      line: gridV[0],
      type: "v",
    };
  }
}
