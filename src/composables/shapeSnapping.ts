import { IRectangle, IVec2, moveRect } from "okageo";
import { getRectLines } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { StyleScheme } from "../models";
import { ShapeSnappingLines } from "../shapes/core";

const SNAP_THRESHOLD = 20;

export interface SnappingResult {
  diff: IVec2;
  targets: SnappingResultTarget[];
}

interface SnappingResultTarget {
  id: string;
  line: [IVec2, IVec2];
}

interface SnappingTmpResult {
  d: number;
  ad: number;
  line: [IVec2, IVec2];
}

interface Option {
  shapeSnappingList: [string, ShapeSnappingLines][];
}

export function newShapeSnapping(option: Option) {
  const shapeSnappingList = option.shapeSnappingList;

  function test(rect: IRectangle): SnappingResult | undefined {
    const [rectTop, rectRight, rectBottom, rectLeft] = getRectLines(rect);

    let xClosest: [string, SnappingTmpResult] | undefined;
    let yClosest: [string, SnappingTmpResult] | undefined;
    shapeSnappingList.map(([id, lines]) => {
      // x snapping
      {
        const vList = lines.v.map<SnappingTmpResult>((line) => {
          return getSnappingTmpResult(line, line[0].x, [
            (rectLeft[0].x + rectRight[0].x) / 2,
            rectLeft[0].x,
            rectRight[0].x,
          ]);
        });
        const closest = vList.filter((v) => v.ad < SNAP_THRESHOLD).sort((a, b) => a.ad - b.ad)[0];
        if (closest) {
          xClosest = xClosest && xClosest[1].ad <= closest.ad ? xClosest : [id, closest];
        }
      }

      // y snapping
      {
        const hList = lines.h.map<SnappingTmpResult>((line) => {
          return getSnappingTmpResult(line, line[0].y, [
            (rectTop[0].y + rectBottom[0].y) / 2,
            rectTop[0].y,
            rectBottom[0].y,
          ]);
        });
        const closest = hList.filter((v) => v.ad < SNAP_THRESHOLD).sort((a, b) => a.ad - b.ad)[0];
        if (closest) {
          yClosest = yClosest && yClosest[1].ad <= closest.ad ? yClosest : [id, closest];
        }
      }
    });

    if (!xClosest && !yClosest) return;

    const targets: SnappingResultTarget[] = [];
    const diff = { x: xClosest?.[1].d ?? 0, y: yClosest?.[1].d ?? 0 };
    const [adjustedTop, , , adjustedLeft] = getRectLines(moveRect(rect, diff));

    if (xClosest) {
      const [id, result] = xClosest;
      const [y0, , , y1] = [adjustedLeft[0].y, adjustedLeft[1].y, result.line[0].y, result.line[1].y].sort(
        (a, b) => a - b
      );
      targets.push({
        id,
        line: [
          { x: result.line[0].x, y: y0 },
          { x: result.line[0].x, y: y1 },
        ],
      });
    }

    if (yClosest) {
      const [id, result] = yClosest;
      const [x0, , , x1] = [adjustedTop[0].x, adjustedTop[1].x, result.line[0].x, result.line[1].x].sort(
        (a, b) => a - b
      );
      targets.push({
        id,
        line: [
          { x: x0, y: result.line[0].y },
          { x: x1, y: result.line[0].y },
        ],
      });
    }

    return { targets, diff };
  }

  return { test };
}
export type ShapeSnapping = ReturnType<typeof newShapeSnapping>;

export function renderSnappingResult(
  ctx: CanvasRenderingContext2D,
  option: { result: SnappingResult; style: StyleScheme; scale: number }
) {
  applyStrokeStyle(ctx, { color: option.style.selectionPrimary });
  ctx.lineWidth = 3 * option.scale;

  const snappingLines = option.result.targets.map((t) => t.line) ?? [];
  ctx.beginPath();
  snappingLines.forEach(([a, b]) => {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  });
  ctx.stroke();
}

function getSnappingTmpResult(line: [IVec2, IVec2], target: number, clients: number[]): SnappingTmpResult {
  return clients
    .map((v) => {
      const d = target - v;
      const ad = Math.abs(d);
      return { d, ad, line };
    })
    .sort((a, b) => a.ad - b.ad)[0];
}
