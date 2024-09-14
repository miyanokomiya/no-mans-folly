import { getDistance, IRectangle, isParallel, isSame, IVec2, sub } from "okageo";
import { getCrossLineAndLine, ISegment, snapNumberCeil } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import { COLORS } from "../utils/color";
import { ShapeSnappingLines } from "../shapes/core";
import { pickMinItem } from "../utils/commons";

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

  function getSegmentsV() {
    return segmentsV;
  }

  function getSegmentsH() {
    return segmentsH;
  }

  function getSnappingLines(): ShapeSnappingLines {
    return { v: segmentsV, h: segmentsH };
  }

  function renderAxisLabels(ctx: CanvasRenderingContext2D, scale = 1) {
    ctx.save();

    applyFillStyle(ctx, { color: COLORS.BLACK });
    ctx.globalAlpha = 0.5;
    ctx.font = `${14 * scale}px Arial`;

    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    segmentsV.forEach(([a, b]) => {
      ctx.fillText(`${a.x}`, a.x, b.y - 4);
    });

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    segmentsH.forEach(([a]) => {
      ctx.fillText(`${a.y}`, a.x + 4, a.y);
    });

    ctx.restore();
  }

  return { getSegmentsV, getSegmentsH, getSnappingLines, renderAxisLabels, disabled, size, range };
}
export type Grid = ReturnType<typeof newGrid>;

export function getGridSize(scale: number): number {
  // Should be scaled by same rate
  if (scale < 0.6) {
    return 25;
  } else if (scale < 1.5) {
    return 50;
  } else if (scale < 2.4) {
    return 100;
  } else if (scale < 4.8) {
    return 200;
  } else {
    return 400;
  }
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
