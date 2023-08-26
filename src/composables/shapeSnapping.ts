import { IRectangle, IVec2, moveRect } from "okageo";
import { getRectLines } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { StyleScheme } from "../models";

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
  lineIndex: number;
  line: [IVec2, IVec2];
}

interface Option {
  shapeSnappingList: [string, [IVec2, IVec2][]][];
}

export function newShapeSnapping(option: Option) {
  const shapeSnappingList = option.shapeSnappingList;

  function test(rect: IRectangle): SnappingResult | undefined {
    const [rectTop, rectRight, rectBottom, rectLeft] = getRectLines(rect);

    const testResultList: [string, SnappingTmpResult][] = [];
    shapeSnappingList.map(([id, lines]) => {
      // x snapping
      {
        const [, right, , left] = lines;
        const dll = left[0].x - rectLeft[0].x;
        const dlr = left[0].x - rectRight[0].x;
        const drl = right[0].x - rectLeft[0].x;
        const drr = right[0].x - rectRight[0].x;
        const adll = Math.abs(dll);
        const adlr = Math.abs(dlr);
        const adrl = Math.abs(drl);
        const adrr = Math.abs(drr);
        const closest = [adll, adlr, adrl, adrr].filter((v) => v < SNAP_THRESHOLD).sort((a, b) => a - b)[0];

        let result: SnappingTmpResult | undefined = undefined;
        if (closest === adll) {
          result = { d: dll, lineIndex: 3, line: left };
        } else if (closest === adlr) {
          result = { d: dlr, lineIndex: 1, line: left };
        } else if (closest === adrl) {
          result = { d: drl, lineIndex: 3, line: right };
        } else if (closest === adrr) {
          result = { d: drr, lineIndex: 1, line: right };
        }

        if (result) {
          testResultList.push([id, result]);
        }
      }

      // y snapping
      {
        const [top, , bottom] = lines;
        const dtt = top[0].y - rectTop[0].y;
        const dtb = top[0].y - rectBottom[0].y;
        const dbt = bottom[0].y - rectTop[0].y;
        const dbb = bottom[0].y - rectBottom[0].y;
        const adtt = Math.abs(dtt);
        const adtb = Math.abs(dtb);
        const adbt = Math.abs(dbt);
        const adbb = Math.abs(dbb);
        const closest = [adtt, adtb, adbt, adbb].filter((v) => v < SNAP_THRESHOLD).sort((a, b) => a - b)[0];

        let result: SnappingTmpResult | undefined = undefined;
        if (closest === adtt) {
          result = { d: dtt, lineIndex: 0, line: top };
        } else if (closest === adtb) {
          result = { d: dtb, lineIndex: 2, line: top };
        } else if (closest === adbt) {
          result = { d: dbt, lineIndex: 0, line: bottom };
        } else if (closest === adbb) {
          result = { d: dbb, lineIndex: 2, line: bottom };
        }

        if (result) {
          testResultList.push([id, result]);
        }
      }
    });

    const xList: [string, SnappingTmpResult][] = [];
    const yList: [string, SnappingTmpResult][] = [];
    testResultList.forEach((item) => {
      switch (item[1].lineIndex) {
        case 0:
        case 2:
          yList.push(item);
          break;
        case 1:
        case 3:
          xList.push(item);
          break;
      }
    });

    if (yList.length === 0 && xList.length === 0) return;

    const targets: SnappingResultTarget[] = [];
    const xClosest = xList.sort(([, a], [, b]) => a.d - b.d)[0];
    const yClosest = yList.sort(([, a], [, b]) => a.d - b.d)[0];
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
