import { IVec2, add, getUnit, isSame, multi, rotate, sub } from "okageo";
import { ISegment } from "./geometry";

export function applyPath(ctx: CanvasRenderingContext2D | Path2D, path: IVec2[], closed = false) {
  path.forEach((p, i) => {
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  });
  if (closed) {
    ctx.closePath();
  }
}

export function renderArrow(ctx: CanvasRenderingContext2D, [a, b]: ISegment, size: number) {
  const v = sub(b, a);
  const n = isSame(a, b) ? { x: size, y: 0 } : multi(getUnit(v), size);

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  [add(a, rotate(n, Math.PI / 4)), add(a, rotate(n, -Math.PI / 4))].forEach((p) => {
    ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  [add(b, rotate(n, (Math.PI * 3) / 4)), add(b, rotate(n, (-Math.PI * 3) / 4))].forEach((p) => {
    ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fill();
}
