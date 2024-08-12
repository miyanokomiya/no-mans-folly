import { IRectangle, IVec2, PathSegmentRaw, add, getRadian, getUnit, isSame, multi, rotate, sub } from "okageo";
import { ISegment, TAU, getArcCurveParamsByNormalizedControl, getRotateFn } from "./geometry";
import { applyStrokeStyle } from "./strokeStyle";
import { applyFillStyle } from "./fillStyle";
import { COLORS } from "./color";
import { Color, CurveControl } from "../models";
import { DEFAULT_FONT_SIZE } from "./textEditor";

export function applyPath(ctx: CanvasRenderingContext2D | Path2D, path: IVec2[], closed = false, reverse = false) {
  if (reverse) {
    for (let i = path.length - 1; i >= 0; i--) {
      const p = path[i];
      i === path.length - 1 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
  } else {
    path.forEach((p, i) => {
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
  }
  if (closed) {
    ctx.closePath();
  }
}

export function applyCurvePath(
  ctx: CanvasRenderingContext2D | Path2D,
  path: IVec2[],
  curves: (CurveControl | undefined)[] = [],
  closed = false,
  jumps?: ISegment[][],
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

    jumps?.[i]?.forEach(([p0, p1]) => {
      const arcParams = getArcCurveParamsByNormalizedControl([p0, p1], { x: 0, y: 15 });
      if (arcParams) {
        ctx.lineTo(p0.x, p0.y);
        ctx.arc(
          arcParams.c.x,
          arcParams.c.y,
          arcParams.radius,
          arcParams.from,
          arcParams.to,
          arcParams.counterclockwise,
        );
      }
    });
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

export function renderRoundedSegment(
  ctx: CanvasRenderingContext2D,
  segs: ISegment[],
  width: number,
  bgColor: Color,
  fgColor?: Color,
) {
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

export function renderOutlinedCircle(ctx: CanvasRenderingContext2D, p: IVec2, r: number, fillColor: Color) {
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.fill();

  applyFillStyle(ctx, { color: fillColor });
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 0.9, 0, TAU);
  ctx.fill();
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

export function renderSwitchDirection(ctx: CanvasRenderingContext2D, p: IVec2, rotation: number, size: number) {
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

export function renderRotationArrow(ctx: CanvasRenderingContext2D, p: IVec2, rotation: number, size: number) {
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

export function renderPlusIcon(ctx: CanvasRenderingContext2D, p: IVec2, size: number) {
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(p.x - half, p.y);
  ctx.lineTo(p.x + half, p.y);
  ctx.moveTo(p.x, p.y - half);
  ctx.lineTo(p.x, p.y + half);
  ctx.stroke();
}

export function renderMoveIcon(ctx: CanvasRenderingContext2D, p: IVec2, size: number) {
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

export function scaleGlobalAlpha(ctx: CanvasRenderingContext2D, scale: number, render: () => void) {
  const original = ctx.globalAlpha;
  ctx.globalAlpha = original * scale;
  render();
  ctx.globalAlpha = original;
}

export function applyLocalSpace(ctx: CanvasRenderingContext2D, rect: IRectangle, rotation: number, fn: () => void) {
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
  ctx: CanvasRenderingContext2D,
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
