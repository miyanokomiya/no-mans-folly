import { IRectangle, IVec2, PathSegmentRaw, add, getRadian, getUnit, isSame, multi, rotate, sub } from "okageo";
import { ISegment, TAU, divideSafely, getArcCurveParamsByNormalizedControl, getRotateFn } from "./geometry";
import { applyStrokeStyle } from "./strokeStyle";
import { applyFillStyle } from "./fillStyle";
import { COLORS } from "./color";
import { Color, CurveControl, Size } from "../models";
import { DEFAULT_FONT_SIZE } from "./textEditorCore";
import { CanvasCTX } from "./types";

export function applyPath(ctx: CanvasCTX | Path2D, path: IVec2[], closed = false, reverse = false) {
  if (reverse) {
    for (let i = path.length - 1; i >= 0; i--) {
      const p = path[i];
      if (i === path.length - 1) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
  } else {
    path.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    });
  }
  if (closed) {
    ctx.closePath();
  }
}

export function applyCurvePath(
  ctx: CanvasCTX | Path2D,
  path: IVec2[],
  curves: (CurveControl | undefined)[] = [],
  closed = false,
) {
  path.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p.x, p.y);
    } else {
      const control = curves[i - 1];
      if (!control) {
        ctx.lineTo(p.x, p.y);
      } else if ("d" in control) {
        const arcParams = getArcCurveParamsByNormalizedControl([path[i - 1], p], control.d);
        if (arcParams) {
          ctx.arc(
            arcParams.c.x,
            arcParams.c.y,
            arcParams.radius,
            arcParams.from,
            arcParams.to,
            arcParams.counterclockwise,
          );
        } else {
          ctx.lineTo(p.x, p.y);
        }
      } else {
        ctx.bezierCurveTo(control.c1.x, control.c1.y, control.c2.x, control.c2.y, p.x, p.y);
      }
    }
  });
  if (closed) {
    ctx.closePath();
  }
}

export function createSVGCurvePath(
  path: IVec2[],
  curves: (CurveControl | undefined)[] = [],
  closed = false,
): PathSegmentRaw[] {
  const ret: PathSegmentRaw[] = [];

  path.forEach((p, i) => {
    if (i === 0) {
      ret.push(["M", p.x, p.y]);
    } else {
      const control = curves[i - 1];
      if (!control) {
        ret.push(["L", p.x, p.y]);
      } else if ("d" in control) {
        const prev = path[i - 1];
        const arcParams = getArcCurveParamsByNormalizedControl([prev, p], control.d);
        if (arcParams) {
          if (isSame(prev, p)) {
            // Need to draw two half arcs for the circle.
            const rotateFn = getRotateFn(getRadian(p, prev));
            const d = add(rotateFn(control.d), prev);
            ret.push([
              "A",
              arcParams.radius,
              arcParams.radius,
              0,
              !!arcParams.largearc,
              !arcParams.counterclockwise,
              d.x,
              d.y,
            ]);
          }

          ret.push([
            "A",
            arcParams.radius,
            arcParams.radius,
            0,
            !!arcParams.largearc,
            !arcParams.counterclockwise,
            p.x,
            p.y,
          ]);
        } else {
          ret.push(["L", p.x, p.y]);
        }
      } else {
        ret.push(["C", control.c1.x, control.c1.y, control.c2.x, control.c2.y, p.x, p.y]);
      }
    }
  });
  if (closed) {
    ret.push(["Z"]);
  }

  return ret;
}

export function renderRoundedSegment(ctx: CanvasCTX, segs: ISegment[], width: number, bgColor: Color, fgColor?: Color) {
  ctx.beginPath();
  segs.forEach((seg) => {
    ctx.moveTo(seg[0].x, seg[0].y);
    ctx.lineTo(seg[1].x, seg[1].y);
  });

  applyStrokeStyle(ctx, { color: bgColor, width: width, lineCap: "round" });
  ctx.stroke();

  if (fgColor) {
    applyStrokeStyle(ctx, { color: fgColor, width: width / 3, lineCap: "round" });
    ctx.stroke();
  }
}

export function renderOutlinedCircle(ctx: CanvasCTX, p: IVec2, r: number, fillColor: Color) {
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.fill();

  applyFillStyle(ctx, { color: fillColor });
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 0.9, 0, TAU);
  ctx.fill();
}

export function renderOutlinedDonutArc(
  ctx: CanvasCTX,
  p: IVec2,
  r: number,
  from: number,
  to: number,
  holeRate: number,
  fillColor: Color,
) {
  ctx.save();
  const region = new Path2D();
  region.arc(p.x, p.y, r, from, to);
  region.arc(p.x, p.y, r * holeRate, to, from, true);
  region.closePath();
  ctx.clip(region);

  applyFillStyle(ctx, { color: fillColor });
  applyStrokeStyle(ctx, { color: COLORS.BLACK, width: r * 0.1 });
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, from, to);
  ctx.arc(p.x, p.y, r * holeRate, to, from, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function renderArrow(ctx: CanvasCTX, [a, b]: ISegment, size: number) {
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

export function renderArrowUnit(ctx: CanvasCTX, p: IVec2, rotation: number, size: number) {
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

export function renderSwitchDirection(ctx: CanvasCTX, p: IVec2, rotation: number, size: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rotation);

  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = size * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.5, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineTo(size * 0.1, size * 0.9);
  ctx.lineTo(-size * 0.5, size * 0.4);
  ctx.lineTo(size * 0.1, size * 0.0);
  ctx.fill();

  ctx.restore();
}

export function renderRotationArrow(ctx: CanvasCTX, p: IVec2, rotation: number, size: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rotation - Math.PI / 4);

  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = size * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.5, -Math.PI, Math.PI / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineTo(size * 0.1, size * 0.9);
  ctx.lineTo(-size * 0.5, size * 0.4);
  ctx.lineTo(size * 0.1, size * 0.0);
  ctx.fill();

  ctx.restore();
}

export function renderReloadIcon(ctx: CanvasCTX, p: IVec2, size: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = size * 0.2;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  function renderHalfArrow() {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.6, -Math.PI * 0.7, -Math.PI * 0.05);
    ctx.stroke();

    ctx.beginPath();
    applyPath(
      ctx,
      [
        { x: size * 0.53, y: size * 0.15 },
        { x: size * 0.21, y: -size * 0.2 },
        { x: size * 0.85, y: -size * 0.2 },
      ],
      true,
    );
    ctx.fill();
    ctx.stroke();
  }

  renderHalfArrow();
  ctx.rotate(Math.PI);
  renderHalfArrow();

  ctx.restore();
}

export function renderLoopeIcon(ctx: CanvasCTX, p: IVec2, size: number) {
  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = size * 0.3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(size * 0.16, -size * 0.16, size * 0.5, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-size * 0.3, size * 0.3);
  ctx.lineTo(-size * 0.65, size * 0.65);
  ctx.stroke();

  ctx.restore();
}

export function renderPlusIcon(ctx: CanvasCTX, p: IVec2, size: number) {
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(p.x - half, p.y);
  ctx.lineTo(p.x + half, p.y);
  ctx.moveTo(p.x, p.y - half);
  ctx.lineTo(p.x, p.y + half);
  ctx.stroke();
}

export function renderMoveIcon(ctx: CanvasCTX, p: IVec2, size: number) {
  const size_1_4 = size / 4;
  const size_1_8 = size_1_4 / 2;
  const size_3_4 = (size * 3) / 4;
  const size_3_16 = size_3_4 / 2;

  const from = { x: size_1_8, y: size_1_8 };
  const arrowPath = [
    { x: size_1_8, y: size_1_8 + size_3_16 },
    { x: size_3_16, y: size_1_8 + size_3_16 },
    { x: 0, y: size_1_4 + size_3_4 },
    { x: -size_3_16, y: size_1_8 + size_3_16 },
    { x: -size_1_8, y: size_1_8 + size_3_16 },
    { x: -size_1_8, y: size_1_8 },
  ];

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  ctx.lineWidth = size * 0.03;
  ctx.translate(p.x, p.y);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  [0, 1, 2, 3].forEach((d) => {
    const rotateFn = getRotateFn((d * Math.PI) / 2);
    arrowPath
      .map((p) => rotateFn(p))
      .forEach((p) => {
        ctx.lineTo(p.x, p.y);
      });
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function scaleGlobalAlpha(ctx: CanvasCTX, scale: number, render: () => void) {
  if (scale === 1) {
    render();
    return;
  }

  const original = ctx.globalAlpha;
  ctx.globalAlpha = original * scale;
  render();
  ctx.globalAlpha = original;
}

export function applyLocalSpace(ctx: CanvasCTX, rect: IRectangle, rotation: number, fn: () => void) {
  ctx.save();

  if (rotation === 0) {
    ctx.translate(rect.x, rect.y);
  } else {
    ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.rotate(rotation);
    ctx.translate(-rect.width / 2, -rect.height / 2);
  }

  fn();
  ctx.restore();
}

export function applyRotation(ctx: CanvasCTX, rotation: number, origin: IVec2, fn: () => void) {
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(rotation);
  ctx.translate(-origin.x, -origin.y);
  fn();
  ctx.restore();
}

export function applyDefaultTextStyle(
  ctx: CanvasCTX,
  fontSize = DEFAULT_FONT_SIZE,
  textAlign: CanvasTextAlign = "left",
  middle = false,
) {
  ctx.font = `${fontSize}px Arial`;
  ctx.setLineDash([]);
  ctx.textBaseline = middle ? "middle" : "alphabetic";
  ctx.textAlign = textAlign;
}

export function renderValueLabel(
  ctx: CanvasCTX,
  value: number | string,
  p: IVec2,
  rotation = 0,
  scale = 1,
  middle = false,
) {
  applyDefaultTextStyle(ctx, 18 * scale, "center", middle);
  applyStrokeStyle(ctx, { color: COLORS.WHITE, width: 2 * scale });
  applyFillStyle(ctx, { color: COLORS.BLACK });
  applyRotation(ctx, rotation, p, () => {
    ctx.beginPath();
    ctx.strokeText(`${value}`, p.x, p.y);
    ctx.fillText(`${value}`, p.x, p.y);
  });
}

export function renderOverlay(ctx: CanvasCTX, rect: IRectangle) {
  scaleGlobalAlpha(ctx, 0.8, () => {
    applyFillStyle(ctx, {
      color: COLORS.GRAY_1,
    });
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.fill();
  });
}

export function getImageAtCenterParams(img: Size, size: Size): IRectangle {
  const [scaleW, scaleH] = [divideSafely(size.width, img.width, 1), divideSafely(size.height, img.height, 1)];
  const scale = Math.min(scaleW, scaleH);
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  const dx = (size.width - scaledWidth) / 2;
  const dy = (size.height - scaledHeight) / 2;
  return { x: dx, y: dy, width: scaledWidth, height: scaledHeight };
}

export function renderImageAtCenter(ctx: CanvasCTX, img: HTMLImageElement, size: Size) {
  const rect = getImageAtCenterParams(img, size);
  ctx.drawImage(img, 0, 0, img.width, img.height, rect.x, rect.y, rect.width, rect.height);
}
