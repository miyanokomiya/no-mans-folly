import { IVec2 } from "okageo";

export function applyPath(ctx: CanvasRenderingContext2D, path: IVec2[], closed = false) {
  path.forEach((p, i) => {
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  });
  if (closed) {
    ctx.closePath();
  }
}
