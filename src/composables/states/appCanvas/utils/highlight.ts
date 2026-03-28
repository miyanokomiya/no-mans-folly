import { IRectangle } from "okageo";
import { StyleScheme } from "../../../../models";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { CanvasCTX } from "../../../../utils/types";
import { applyCurvePath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { BezierPath } from "../../../../utils/path";

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
      ctx.beginPath();
      movingOutline.forEach((path) => applyCurvePath(ctx, path.path, path.curves, true));
      ctx.stroke();
    }
  });
}
