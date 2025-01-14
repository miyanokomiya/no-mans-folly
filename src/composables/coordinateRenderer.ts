import { IRectangle, IVec2, MINVALUE } from "okageo";
import { applyDefaultTextStyle } from "../utils/renderer";
import { applyFillStyle } from "../utils/fillStyle";
import { COLORS } from "../utils/color";
import { logRound } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { CanvasCTX } from "../utils/types";

export type CoordinateRenderer = {
  saveCoord: (p?: IVec2) => void;
  render: (ctx: CanvasCTX, viewRect: IRectangle, scale: number) => void;
};

type Option = {
  coord?: IVec2;
};

export function newCoordinateRenderer(option?: Option) {
  let coord = option?.coord;

  function saveCoord(p?: IVec2) {
    coord = p;
  }

  function render(ctx: CanvasCTX, viewRect: IRectangle, scale: number) {
    if (!coord) return;

    const size = 20 * scale;
    applyDefaultTextStyle(ctx, size, "center", true);
    const textX = formatValue(coord.x);
    const textY = formatValue(coord.y);
    const text = `${textX} , ${textY}`;
    const paddingX = 8 * scale;
    const paddingY = 4 * scale;
    const width = ctx.measureText(text).width + 2 * paddingX;
    const height = size + 2 * paddingY;
    const x = viewRect.x + viewRect.width / 2;
    const y = viewRect.y + size + 4 * scale;
    applyFillStyle(ctx, { color: COLORS.WHITE });
    applyStrokeStyle(ctx, { color: COLORS.BLACK, width: scale });
    ctx.beginPath();
    const adjustmentY = -2 * scale;
    ctx.roundRect(x - width / 2, y - height / 2 + adjustmentY, width, height, 4 * scale);
    ctx.fill();
    ctx.stroke();
    applyFillStyle(ctx, { color: COLORS.BLACK });
    ctx.fillText(text, x, y);
  }

  return { saveCoord, render };
}

function formatValue(v: number): string {
  const rounded = logRound(-2, v);
  return Math.abs(v - rounded) < MINVALUE ? `${rounded}` : `${rounded}..`;
}
