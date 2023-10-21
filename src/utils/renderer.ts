import { IRectangle, IVec2, add, getUnit, isSame, multi, rotate, sub } from "okageo";
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

export function renderPlusIcon(ctx: CanvasRenderingContext2D, p: IVec2, size: number) {
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(p.x - half, p.y);
  ctx.lineTo(p.x + half, p.y);
  ctx.moveTo(p.x, p.y - half);
  ctx.lineTo(p.x, p.y + half);
  ctx.stroke();

  ctx.beginPath();
}

export function scaleGlobalAlpha(ctx: CanvasRenderingContext2D, scale: number, render: () => void) {
  const original = ctx.globalAlpha;
  ctx.globalAlpha = original * scale;
  render();
  ctx.globalAlpha = original;
}

export function applyLocalSpace(ctx: CanvasRenderingContext2D, rect: IRectangle, rotation: number, fn: () => void) {
  ctx.save();
  ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
  ctx.rotate(rotation);
  ctx.translate(-rect.width / 2, -rect.height / 2);
  fn();
  ctx.restore();
}
