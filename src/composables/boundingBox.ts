import { IVec2, getCenter, getRadian, isOnPolygon, rotate } from "okageo";
import { applyPath } from "../utils/renderer";
import { StyleScheme } from "../models";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { isPointCloseToSegment } from "../utils/geometry";

const ANCHOR_SIZE = 5;

type HitType = "corner" | "segment" | "area";

interface Option {
  path: IVec2[];
  styleScheme: StyleScheme;
}

export function newBoundingBox(option: Option) {
  const [tl, tr, br, bl] = option.path;
  const rotation = tl.x === tr.x ? 0 : getRadian(tr, tl);

  const anchors = option.path.map((p) => {
    const x0 = p.x - ANCHOR_SIZE;
    const x1 = p.x + ANCHOR_SIZE;
    const y0 = p.y - ANCHOR_SIZE;
    const y1 = p.y + ANCHOR_SIZE;
    const rect = [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ];

    if (rotation === 0) return rect;

    const c = getCenter(rect[0], rect[2]);
    return rect.map((q) => rotate(q, rotation, c));
  });

  const segments = [
    [tl, tr],
    [tr, br],
    [br, bl],
    [bl, tl],
  ];

  function hitTest(p: IVec2): { type: HitType; index: number } | undefined {
    const cornerIndex = anchors.findIndex((a) => isOnPolygon(p, a));
    if (cornerIndex > -1) {
      return { type: "corner", index: cornerIndex };
    }

    const segIndex = segments.findIndex((s) => isPointCloseToSegment(s, p, ANCHOR_SIZE));
    if (segIndex > -1) {
      return { type: "segment", index: segIndex };
    }

    if (isOnPolygon(p, option.path)) {
      return { type: "area", index: 0 };
    }
  }

  function render(ctx: CanvasRenderingContext2D) {
    const style = option.styleScheme;
    applyStrokeStyle(ctx, { color: style.selectionPrimary });
    ctx.lineWidth = 2;
    ctx.fillStyle = "#fff";

    ctx.beginPath();
    applyPath(ctx, option.path, true);
    ctx.stroke();

    anchors.forEach((anchor) => {
      ctx.beginPath();
      applyPath(ctx, anchor, true);
      ctx.fill();
      ctx.stroke();
    });
  }

  return {
    hitTest,
    render,
  };
}
