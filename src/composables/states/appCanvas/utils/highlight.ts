import { IRectangle } from "okageo";
import { StyleScheme } from "../../../../models";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { CanvasCTX } from "../../../../utils/types";
import { ShapeComposite } from "../../../shapeComposite";
import { applyCurvePath, scaleGlobalAlpha } from "../../../../utils/renderer";

export function renderMovingHighlight(
  ctx: CanvasCTX,
  {
    style,
    scale,
    movingRect,
    shapeComposite,
    targetIds,
  }: {
    style: StyleScheme;
    scale: number;
    movingRect: IRectangle;
    shapeComposite: ShapeComposite;
    targetIds: string[];
  },
) {
  scaleGlobalAlpha(ctx, 0.7, () => {
    const rectStrokeWidth = style.selectionLineWidth * scale * (targetIds.length > 1 ? 1 : 0.5);
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: rectStrokeWidth });
    ctx.beginPath();
    ctx.strokeRect(movingRect.x, movingRect.y, movingRect.width, movingRect.height);

    if (targetIds.length > 1) return;
    const target = shapeComposite.mergedShapeMap[targetIds[0]];
    if (!target) return;

    const paths = shapeComposite.getHighlightPaths(target);
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: style.selectionLineWidth * scale });
    ctx.beginPath();
    paths.forEach((path) => applyCurvePath(ctx, path.path, path.curves));
    ctx.stroke();
  });
}
