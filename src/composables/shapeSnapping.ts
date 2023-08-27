import { IRectangle, IVec2, moveRect } from "okageo";
import { getRectLines, isRangeOverlapped } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { StyleScheme } from "../models";
import { ShapeSnappingLines } from "../shapes/core";

const SNAP_THRESHOLD = 20;

export interface SnappingResult {
  diff: IVec2;
  targets: SnappingResultTarget[];
  intervalTargets: IntervalSnappingResultTarget[];
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
  const shapeIntervalSnapping = newShapeIntervalSnapping(option);

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

    const intervalResult = shapeIntervalSnapping.test(rect);

    if (!xClosest && !yClosest && !intervalResult) return;

    const isVInterval =
      (xClosest && intervalResult?.v && intervalResult.v.ad < xClosest[1].ad) || (!xClosest && intervalResult?.v);
    const isHInterval =
      (yClosest && intervalResult?.h && intervalResult.h.ad < yClosest[1].ad) || (!yClosest && intervalResult?.h);
    const dx = isVInterval ? intervalResult.v!.d : xClosest?.[1].d ?? 0;
    const dy = isHInterval ? intervalResult.h!.d : yClosest?.[1].d ?? 0;

    const targets: SnappingResultTarget[] = [];
    const diff = { x: dx, y: dy };
    const [adjustedTop, , , adjustedLeft] = getRectLines(moveRect(rect, diff));
    const intervalTargets: IntervalSnappingResultTarget[] = [];

    if (isVInterval) {
      const y = (adjustedLeft[0].y + adjustedLeft[1].y) / 2;
      intervalTargets.push({
        ...intervalResult.v!.target,
        lines: intervalResult.v!.target.lines.map<[IVec2, IVec2]>((l) => [
          { x: l[0].x, y },
          { x: l[1].x, y },
        ]),
      });
    } else if (xClosest) {
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

    if (isHInterval) {
      const x = (adjustedTop[0].x + adjustedTop[1].x) / 2;
      intervalTargets.push({
        ...intervalResult.h!.target,
        lines: intervalResult.h!.target.lines.map<[IVec2, IVec2]>((l) => [
          { x, y: l[0].y },
          { x, y: l[1].y },
        ]),
      });
    } else if (yClosest) {
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

    return { targets, intervalTargets, diff };
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

  option.result.intervalTargets?.forEach((t) => {
    t.lines.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
  });
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

interface IntervalSnappingInfo {
  v: {
    targets: IntervalSnappingTarget[];
    targetFns: IntervalSnappingTargetFn[];
  };
  h: {
    targets: IntervalSnappingTarget[];
    targetFns: IntervalSnappingTargetFn[];
  };
}

type IntervalSnappingTargetFn = (size: number) => IntervalSnappingTarget | undefined;

interface IntervalSnappingTarget {
  before: IntervalSnappingItem;
  after: IntervalSnappingItem;
  v: number;
}

interface IntervalSnappingItem {
  id: string;
  vv: [number, number];
}

export interface InvervalSnappingResult {
  v?: {
    d: number;
    ad: number;
    target: IntervalSnappingResultTarget;
  };
  h?: {
    d: number;
    ad: number;
    target: IntervalSnappingResultTarget;
  };
}

interface IntervalSnappingResultTarget {
  beforeId: string;
  afterId: string;
  lines: [IVec2, IVec2][];
}

export function newShapeIntervalSnapping(option: Option) {
  const info = getIntervalSnappingInfo(option.shapeSnappingList);

  function test(rect: IRectangle): InvervalSnappingResult | undefined {
    const [rectTop, rectRight, rectBottom, rectLeft] = getRectLines(rect);
    const rectW = rect.width;
    const rectH = rect.height;

    let xClosest: [target: IntervalSnappingTarget, d: number, ad: number] | undefined;

    info.v.targets.forEach((target) => {
      const closest = getIntervalSnappingTmpResult(target.v, [rectLeft[0].x, rectRight[0].x]);
      if (!closest || SNAP_THRESHOLD < closest.ad) return;
      xClosest = xClosest && xClosest[2] <= closest.ad ? xClosest : [target, closest.d, closest.ad];
    });
    info.v.targetFns
      .map((fn) => fn(rectW))
      .forEach((target) => {
        if (!target) return;
        const closest = getIntervalSnappingTmpResult(target.v, [rectLeft[0].x]);
        if (!closest || SNAP_THRESHOLD < closest.ad) return;
        xClosest = xClosest && xClosest[2] <= closest.ad ? xClosest : [target, closest.d, closest.ad];
      });

    let yClosest: [target: IntervalSnappingTarget, d: number, ad: number] | undefined;

    info.h.targets.forEach((target) => {
      const closest = getIntervalSnappingTmpResult(target.v, [rectTop[0].y, rectBottom[0].y]);
      if (!closest || SNAP_THRESHOLD < closest.ad) return;
      yClosest = yClosest && yClosest[2] <= closest.ad ? yClosest : [target, closest.d, closest.ad];
    });
    info.h.targetFns
      .map((fn) => fn(rectH))
      .forEach((target) => {
        if (!target) return;
        const closest = getIntervalSnappingTmpResult(target.v, [rectTop[0].y]);
        if (!closest || SNAP_THRESHOLD < closest.ad) return;
        yClosest = yClosest && yClosest[2] <= closest.ad ? yClosest : [target, closest.d, closest.ad];
      });

    const diff = {
      x: xClosest?.[1] ?? 0,
      y: yClosest?.[1] ?? 0,
    };
    const [adjustedTop, , , adjustedLeft] = getRectLines(moveRect(rect, diff));

    const ret: InvervalSnappingResult = {};

    if (xClosest) {
      const info = xClosest[0];
      const y = (adjustedLeft[0].y + adjustedLeft[1].y) / 2;
      ret.v = {
        d: diff.x,
        ad: Math.abs(diff.x),
        target: {
          beforeId: info.before.id,
          afterId: info.after.id,
          lines: [
            [
              { x: info.before.vv[0], y },
              { x: info.before.vv[1], y },
            ],
            [
              { x: info.after.vv[0], y },
              { x: info.after.vv[1], y },
            ],
          ],
        },
      };
    }

    if (yClosest) {
      const info = yClosest[0];
      const x = (adjustedTop[0].x + adjustedTop[1].x) / 2;
      ret.h = {
        d: diff.y,
        ad: Math.abs(diff.y),
        target: {
          beforeId: info.before.id,
          afterId: info.after.id,
          lines: [
            [
              { x, y: info.before.vv[0] },
              { x, y: info.before.vv[1] },
            ],
            [
              { x, y: info.after.vv[0] },
              { x, y: info.after.vv[1] },
            ],
          ],
        },
      };
    }

    return ret.v || ret.h ? ret : undefined;
  }

  return { test };
}
export type ShapeIntervalSnapping = ReturnType<typeof newShapeIntervalSnapping>;

function getIntervalSnappingInfo(shapeSnappingList: [string, ShapeSnappingLines][]): IntervalSnappingInfo {
  const vList: IntervalSnappingTarget[] = [];
  const vFnList: IntervalSnappingTargetFn[] = [];
  const hList: IntervalSnappingTarget[] = [];
  const hFnList: IntervalSnappingTargetFn[] = [];

  for (let i = 0; i < shapeSnappingList.length; i++) {
    const s0 = shapeSnappingList[i];
    const l0 = s0[1].v[0];
    const r0 = s0[1].v[s0[1].v.length - 1];
    const t0 = s0[1].h[0];
    const b0 = s0[1].h[s0[1].v.length - 1];

    const hRange: [number, number] = [l0[0].x, r0[0].x];
    const vRange: [number, number] = [t0[0].y, b0[0].y];

    for (let j = 0; j < shapeSnappingList.length; j++) {
      if (i === j) continue;

      const s1 = shapeSnappingList[j];
      const l1 = s1[1].v[0];
      const r1 = s1[1].v[s1[1].v.length - 1];
      const t1 = s1[1].h[0];
      const b1 = s1[1].h[s1[1].h.length - 1];

      if (r0[0].x < l1[0].x && isRangeOverlapped(vRange, [t1[0].y, b1[0].y])) {
        const d = l1[0].x - r0[0].x;

        {
          const v = l0[0].x - d;
          const a: IntervalSnappingTarget = {
            v,
            before: { id: s0[0], vv: [v, l0[0].x] },
            after: { id: s1[0], vv: [r0[0].x, l1[0].x] },
          };
          vList.push(a);
        }

        {
          const v = r1[0].x + d;
          const a: IntervalSnappingTarget = {
            v,
            before: { id: s0[0], vv: [r0[0].x, l1[0].x] },
            after: { id: s1[0], vv: [r1[0].x, v] },
          };
          vList.push(a);
        }

        {
          vFnList.push((size) => {
            const margin = d - size;
            if (margin <= 0) return;

            const v = r0[0].x + margin / 2;
            return {
              v,
              before: { id: s0[0], vv: [r0[0].x, v] },
              after: { id: s1[0], vv: [v + size, l1[0].x] },
            };
          });
        }
      }

      if (b0[0].y < t1[0].y && isRangeOverlapped(hRange, [l1[0].x, r1[0].x])) {
        const d = t1[0].y - b0[0].y;

        {
          const v = t0[0].y - d;
          const a: IntervalSnappingTarget = {
            v,
            before: { id: s0[0], vv: [v, t0[0].y] },
            after: { id: s1[0], vv: [b0[0].y, t1[0].y] },
          };
          hList.push(a);
        }

        {
          const v = b1[0].y + d;
          const a: IntervalSnappingTarget = {
            v,
            before: { id: s0[0], vv: [b0[0].y, t1[0].y] },
            after: { id: s1[0], vv: [b1[0].y, v] },
          };
          hList.push(a);
        }

        {
          hFnList.push((size) => {
            const margin = d - size;
            if (margin <= 0) return;

            const v = b0[0].y + margin / 2;
            return {
              v,
              before: { id: s0[0], vv: [b0[0].y, v] },
              after: { id: s1[0], vv: [v + size, t1[0].y] },
            };
          });
        }
      }
    }
  }

  return {
    v: {
      targets: vList,
      targetFns: vFnList,
    },
    h: {
      targets: hList,
      targetFns: hFnList,
    },
  };
}

type IntervalSnappingTmpResult = Omit<SnappingTmpResult, "line">;

function getIntervalSnappingTmpResult(target: number, clients: number[]): IntervalSnappingTmpResult {
  return clients
    .map((v) => {
      const d = target - v;
      const ad = Math.abs(d);
      return { d, ad };
    })
    .sort((a, b) => a.ad - b.ad)[0];
}
