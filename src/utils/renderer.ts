import { IRectangle, IVec2, add, getUnit, isSame, multi, rotate, sub } from "okageo";
import { ISegment } from "./geometry";
import { applyStrokeStyle } from "./strokeStyle";
import { applyFillStyle } from "./fillStyle";
import { COLORS } from "./color";

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

export function renderArrowUnit(ctx: CanvasRenderingContext2D, p: IVec2, rotation: number, size: number) {
  const n = { x: size, y: 0 };

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  const b = rotate(n, Math.PI * 0.7);
  ctx.lineTo(b.x, b.y);
  const c = rotate(n, -Math.PI * 0.7);
  ctx.lineTo(c.x, c.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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

export function applyRotation(ctx: CanvasRenderingContext2D, rotation: number, origin: IVec2, fn: () => void) {
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(rotation);
  ctx.translate(-origin.x, -origin.y);
  fn();
  ctx.restore();
}

export function applyDefaultTextStyle(
  ctx: CanvasRenderingContext2D,
  fontSize = 18,
  textAlign: CanvasTextAlign = "left",
) {
  ctx.font = `${fontSize}px Arial`;
  ctx.setLineDash([]);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = textAlign;
}

export function renderValueLabel(ctx: CanvasRenderingContext2D, value: number, p: IVec2, rotation = 0, scale = 1) {
  applyDefaultTextStyle(ctx, 24, "center");
  applyStrokeStyle(ctx, { color: COLORS.WHITE, width: 2 * scale });
  applyFillStyle(ctx, { color: COLORS.BLACK });
  applyRotation(ctx, rotation, p, () => {
    ctx.beginPath();
    ctx.strokeText(`${value}`, p.x, p.y);
    ctx.fillText(`${value}`, p.x, p.y);
  });
}
