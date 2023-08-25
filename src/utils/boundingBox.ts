import { IVec2, getPolygonCenter } from "okageo";
import { applyPath } from "./renderer";

export const ANCHOR_SIZE = 5;

export function renderBoundingBox(ctx: CanvasRenderingContext2D, path: IVec2[], rotation = 0) {
  if (rotation === 0) {
    ctx.beginPath();
    applyPath(ctx, path, true);
    ctx.stroke();

    ctx.beginPath();
    path.forEach((p) => {
      ctx.strokeRect(p.x - ANCHOR_SIZE, p.y - ANCHOR_SIZE, ANCHOR_SIZE * 2, ANCHOR_SIZE * 2);
    });
    return;
  }

  ctx.save();
  const c = getPolygonCenter(path);
  ctx.translate(c.x, c.y);
  ctx.rotate(rotation);
  ctx.translate(-c.x, -c.y);

  ctx.beginPath();
  applyPath(ctx, path, true);
  ctx.fillStyle = "#fff";
  ctx.stroke();
  ctx.beginPath();
  path.forEach((p) => {
    ctx.fillRect(p.x - ANCHOR_SIZE, p.y - ANCHOR_SIZE, ANCHOR_SIZE * 2, ANCHOR_SIZE * 2);
    ctx.strokeRect(p.x - ANCHOR_SIZE, p.y - ANCHOR_SIZE, ANCHOR_SIZE * 2, ANCHOR_SIZE * 2);
  });

  ctx.restore();
}
