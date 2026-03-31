import { IRectangle } from "okageo";
import { StyleScheme } from "../../../../models";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { CanvasCTX } from "../../../../utils/types";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { BezierPath } from "../../../../utils/path";
import { TAU } from "../../../../utils/geometry";
import { applyFillStyle } from "../../../../utils/fillStyle";

export function renderMovingHighlight(
  ctx: CanvasCTX,
  {
    style,
    scale,
    movingRect,
    movingOutline,
  }: {
    style: StyleScheme;
    scale: number;
    movingRect: IRectangle;
    movingOutline?: BezierPath[];
  },
) {
  scaleGlobalAlpha(ctx, 0.7, () => {
    const strokeWidth = (style.selectionLineWidth * scale) / 2;
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: strokeWidth });
    ctx.beginPath();
    ctx.strokeRect(movingRect.x, movingRect.y, movingRect.width, movingRect.height);

    if (movingOutline) {
      const radius = 4 * scale;
      applyFillStyle(ctx, { color: style.selectionPrimary });
      ctx.beginPath();
      movingOutline.forEach(({ path }) =>
        path.forEach((p) => {
          ctx.moveTo(p.x, p.y);
          ctx.arc(p.x, p.y, radius, 0, TAU);
        }),
      );
      ctx.fill();
    }
  });
}

export function renderMovingBoundsHighlight(
  ctx: CanvasCTX,
  {
    style,
    scale,
    movingRect,
  }: {
    style: StyleScheme;
    scale: number;
    movingRect: IRectangle;
  },
) {
  scaleGlobalAlpha(ctx, 0.7, () => {
    const strokeWidth = (style.selectionLineWidth * scale) / 2;
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: strokeWidth });
    ctx.beginPath();
    ctx.strokeRect(movingRect.x, movingRect.y, movingRect.width, movingRect.height);
  });
}
