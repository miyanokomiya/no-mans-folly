import { IRectangle } from "okageo";
import { snapNumber } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { COLORS } from "../utils/color";

interface Option {
  size: number;
  range: IRectangle;
}

export function newGrid({ size, range }: Option) {
  const countV = Math.ceil(range.width / size);
  const countH = Math.ceil(range.height / size);

  const segmentsV = [...Array(countV)].map((_, i) => {
    const x = snapNumber(range.x + i * size, size);
    return [
      { x, y: range.y },
      { x, y: range.y + range.height },
    ];
  });

  const segmentsH = [...Array(countH)].map((_, i) => {
    const y = snapNumber(range.y + i * size, size);
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

  function render(ctx: CanvasRenderingContext2D, scale = 1) {
    ctx.save();

    ctx.globalAlpha = 0.3;
    applyFillStyle(ctx, { color: COLORS.BLACK });
    applyStrokeStyle(ctx, { color: COLORS.BLACK, width: 1 });

    segmentsV.forEach(([aV]) => {
      segmentsH.forEach(([aH]) => {
        ctx.beginPath();
        ctx.arc(aV.x, aH.y, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
      });
    });

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

  return { getSegmentsV, getSegmentsH, render };
}
export type newGrid = ReturnType<typeof newGrid>;

export function getGridSize(scale: number): number {
  // Should be scaled by same rate
  if (scale < 0.75) {
    return 50;
  } else if (scale < 2) {
    return 100;
  } else {
    return 200;
  }
}
