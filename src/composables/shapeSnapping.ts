import { IRectangle, IVec2 } from "okageo";
import { getRectLines } from "../utils/geometry";

const SNAP_THRESHOLD = 20;

interface SnappingResult {
  dx?: number;
  dy?: number;
  targets: {
    id: string;
    line: [IVec2, IVec2];
  }[];
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
          result = { d: dlr, lineIndex: 3, line: left };
        } else if (closest === adrl) {
          result = { d: drl, lineIndex: 1, line: right };
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
          result = { d: dtb, lineIndex: 0, line: top };
        } else if (closest === adbt) {
          result = { d: dbt, lineIndex: 2, line: bottom };
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

    const ret: SnappingResult = { targets: [] };

    if (xList.length > 0) {
      const closest = xList.sort(([, a], [, b]) => a.d - b.d)[0];
      ret.dx = closest[1].d;
      ret.targets.push({ id: closest[0], line: closest[1].line });
    }

    if (yList.length > 0) {
      const closest = yList.sort(([, a], [, b]) => a.d - b.d)[0];
      ret.dy = closest[1].d;
      ret.targets.push({ id: closest[0], line: closest[1].line });
    }

    return ret;
  }

  return { test };
}
export type ShapeSnapping = ReturnType<typeof newShapeSnapping>;
