import { IRectangle } from "okageo";
import { ISegment, TAU, snapNumberCeil } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import { COLORS } from "../utils/color";
import { ShapeSnappingLines } from "../shapes/core";

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

  function render(ctx: CanvasRenderingContext2D, scale = 1) {
    ctx.save();

    ctx.globalAlpha = 0.3;
    applyFillStyle(ctx, { color: COLORS.BLACK });

    const radius = 2 * scale;
    segmentsV.forEach(([aV]) => {
      segmentsH.forEach(([aH]) => {
        ctx.beginPath();
        ctx.arc(aV.x, aH.y, radius, 0, TAU);
        ctx.fill();
      });
    });

    ctx.restore();
  }

  function renderAxisLabels(ctx: CanvasRenderingContext2D, scale = 1) {
    ctx.save();

    applyFillStyle(ctx, { color: COLORS.BLACK });
    ctx.globalAlpha = 0.5;
    ctx.font = `${14 * scale}px Arial`;

    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    segmentsV
      .filter(([a]) => a.x % 100 === 0)
      .forEach(([a, b]) => {
        ctx.fillText(`${a.x}`, a.x, b.y - 4);
      });

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    segmentsH
      .filter(([a]) => a.y % 100 === 0)
      .forEach(([a]) => {
        ctx.fillText(`${a.y}`, a.x + 4, a.y);
      });

    ctx.restore();
  }

  return { getSegmentsV, getSegmentsH, getSnappingLines, render, renderAxisLabels, disabled };
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
