import { AffineMatrix, IRectangle, IVec2, MINVALUE, add, applyAffine, getNorm, moveRect } from "okageo";
import { getRectLines, isRangeOverlapped } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { StyleScheme } from "../models";
import { ShapeSnappingLines } from "../shapes/core";
import { renderArrow } from "../utils/renderer";
import { applyFillStyle } from "../utils/fillStyle";
import { pickMinItem } from "../utils/commons";
import { BoundingBoxResizing } from "./boundingBox";

const SNAP_THRESHOLD = 10;
const GRID_ID = "GRID";

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
  gridSnapping?: ShapeSnappingLines;
  scale?: number;
}

interface TestOption {
  disabledEdges: {
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
  };
}

export function newShapeSnapping(option: Option) {
  const shapeSnappingList = option.shapeSnappingList;
  const gridSnapping = option.gridSnapping;
  const shapeIntervalSnapping = newShapeIntervalSnapping(option);
  const snapThreshold = SNAP_THRESHOLD * (option.scale ?? 1);
  const shapeAndGridSnappingList: [string, ShapeSnappingLines][] = gridSnapping
    ? [[GRID_ID, gridSnapping], ...shapeSnappingList]
    : shapeSnappingList;

  function test(rect: IRectangle, option?: TestOption): SnappingResult | undefined {
    const [rectTop, rectRight, rectBottom, rectLeft] = getRectLines(rect);

    let xClosest: [string, SnappingTmpResult] | undefined;
    let yClosest: [string, SnappingTmpResult] | undefined;
    let xClosestOthers: [string, SnappingTmpResult][] = [];
    let yClosestOthers: [string, SnappingTmpResult][] = [];
    shapeAndGridSnappingList.map(([id, lines]) => {
      // x snapping
      {
        const vList = lines.v.map<SnappingTmpResult>((line) => {
          return getSnappingTmpResult(line, line[0].x, [
            (rectLeft[0].x + rectRight[0].x) / 2,
            rectLeft[0].x,
            rectRight[0].x,
          ]);
        });
        const candidates = vList.filter((v) => v.ad < snapThreshold);
        const closest = pickMinItem(candidates, (v) => v.ad);
        if (closest) {
          if (!xClosest) {
            // Save as the initial cnadidates.
            xClosest = [id, closest];
            xClosestOthers = candidates
              .filter((c) => c !== closest && Math.abs(c.ad - closest.ad) < MINVALUE)
              .map((c) => [id, c]);
          } else if (Math.abs(xClosest[1].ad - closest.ad) < MINVALUE) {
            // Save as cnadidates.
            xClosestOthers = xClosestOthers.concat(
              candidates.filter((c) => Math.abs(c.ad - closest.ad) < MINVALUE).map((c) => [id, c]),
            );
          } else if (closest.ad < xClosest[1].ad) {
            // Save as new closer cnadidates.
            xClosest = [id, closest];
            xClosestOthers = candidates
              .filter((c) => c !== closest && Math.abs(c.ad - closest.ad) < MINVALUE)
              .map((c) => [id, c]);
          }
        }
      }

      // y snapping
      {
        const hList = lines.h.map<SnappingTmpResult>((line) => {
          const values: number[] = [];
          if (!option?.disabledEdges.top && !option?.disabledEdges.bottom)
            values.push((rectTop[0].y + rectBottom[0].y) / 2);
          if (!option?.disabledEdges.top) values.push(rectTop[0].y);
          if (!option?.disabledEdges.bottom) values.push(rectBottom[0].y);

          return getSnappingTmpResult(line, line[0].y, values);
        });
        const candidates = hList.filter((v) => v.ad < snapThreshold);
        const closest = pickMinItem(candidates, (v) => v.ad);
        if (closest) {
          if (!yClosest) {
            // Save as the initial cnadidates.
            yClosest = [id, closest];
            yClosestOthers = candidates
              .filter((c) => c !== closest && Math.abs(c.ad - closest.ad) < MINVALUE)
              .map((c) => [id, c]);
          } else if (Math.abs(yClosest[1].ad - closest.ad) < MINVALUE) {
            // Save as cnadidates.
            yClosestOthers = yClosestOthers.concat(
              candidates.filter((c) => Math.abs(c.ad - closest.ad) < MINVALUE).map((c) => [id, c]),
            );
          } else if (closest.ad < yClosest[1].ad) {
            // Save as new closer cnadidates.
            yClosest = [id, closest];
            yClosestOthers = candidates
              .filter((c) => c !== closest && Math.abs(c.ad - closest.ad) < MINVALUE)
              .map((c) => [id, c]);
          }
        }
      }
    });

    const intervalResult = shapeIntervalSnapping.test(rect);

    if (!xClosest && !yClosest && !intervalResult) return;

    const isVInterval =
      (xClosest && intervalResult?.v && intervalResult.v.ad < xClosest[1].ad) || (!xClosest && intervalResult?.v);
    const isHInterval =
      (yClosest && intervalResult?.h && intervalResult.h.ad < yClosest[1].ad) || (!yClosest && intervalResult?.h);
    const dx = isVInterval ? intervalResult.v!.d : (xClosest?.[1].d ?? 0);
    const dy = isHInterval ? intervalResult.h!.d : (yClosest?.[1].d ?? 0);

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
      [xClosest, ...xClosestOthers].forEach((c) => {
        const [id, result] = c;
        const [y0, , , y1] = [adjustedLeft[0].y, adjustedLeft[1].y, result.line[0].y, result.line[1].y].sort(
          (a, b) => a - b,
        );
        targets.push({
          id,
          line: [
            { x: result.line[0].x, y: y0 },
            { x: result.line[0].x, y: y1 },
          ],
        });
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
      [yClosest, ...yClosestOthers].forEach((c) => {
        const [id, result] = c;
        const [x0, , , x1] = [adjustedTop[0].x, adjustedTop[1].x, result.line[0].x, result.line[1].x].sort(
          (a, b) => a - b,
        );
        targets.push({
          id,
          line: [
            { x: x0, y: result.line[0].y },
            { x: x1, y: result.line[0].y },
          ],
        });
      });
    }

    return { targets, intervalTargets, diff };
  }

  function testPoint(p: IVec2): SnappingResult | undefined {
    let xClosest: [string, SnappingTmpResult] | undefined;
    let yClosest: [string, SnappingTmpResult] | undefined;
    shapeAndGridSnappingList.map(([id, lines]) => {
      // x snapping
      {
        const vList = lines.v.map<SnappingTmpResult>((line) => {
          return getSnappingTmpResult(line, line[0].x, [p.x]);
        });
        const closest = pickMinItem(
          vList.filter((v) => v.ad < snapThreshold),
          (v) => v.ad,
        );
        if (closest) {
          xClosest = xClosest && xClosest[1].ad <= closest.ad ? xClosest : [id, closest];
        }
      }

      // y snapping
      {
        const hList = lines.h.map<SnappingTmpResult>((line) => {
          return getSnappingTmpResult(line, line[0].y, [p.y]);
        });
        const closest = pickMinItem(
          hList.filter((v) => v.ad < snapThreshold),
          (v) => v.ad,
        );
        if (closest) {
          yClosest = yClosest && yClosest[1].ad <= closest.ad ? yClosest : [id, closest];
        }
      }
    });

    if (!xClosest && !yClosest) return;

    const dx = xClosest?.[1].d ?? 0;
    const dy = yClosest?.[1].d ?? 0;

    const targets: SnappingResultTarget[] = [];
    const diff = { x: dx, y: dy };
    const adjustedP = add(p, diff);
    const intervalTargets: IntervalSnappingResultTarget[] = [];

    if (xClosest) {
      const [id, result] = xClosest;
      const [y0, , y1] = [adjustedP.y, result.line[0].y, result.line[1].y].sort((a, b) => a - b);
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
      const [x0, , x1] = [adjustedP.x, result.line[0].x, result.line[1].x].sort((a, b) => a - b);
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

  return { test, testPoint, snapThreshold };
}
export type ShapeSnapping = ReturnType<typeof newShapeSnapping>;

export function renderSnappingResult(
  ctx: CanvasRenderingContext2D,
  option: {
    result: SnappingResult;
    style: StyleScheme;
    scale: number;
    getTargetRect?: (id: string) => IRectangle | undefined;
  },
) {
  applyStrokeStyle(ctx, { color: option.style.selectionPrimary, width: 2 * option.scale });
  applyFillStyle(ctx, { color: option.style.selectionPrimary });

  const snappingLines = option.result.targets.map((t) => t.line) ?? [];
  ctx.beginPath();
  snappingLines.forEach(([a, b]) => {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  });
  ctx.stroke();

  if (!option.getTargetRect) return;

  const arrowSize = 10 * option.scale;

  option.result.intervalTargets?.forEach((t) => {
    const before = option.getTargetRect?.(t.beforeId);
    const after = option.getTargetRect?.(t.afterId);
    if (!before || !after) return;

    const isV = t.direction === "v";
    const min = !isV ? Math.min(before.x, after.x) : Math.min(before.y, after.y);
    const max = !isV
      ? Math.max(before.x + before.width, after.x + after.width)
      : Math.max(before.y + before.height, after.y + after.height);

    t.lines.forEach(([a, b]) => {
      if (isV) {
        const mi = Math.min(min, a.y, b.y);
        const ma = Math.max(max, a.y, b.y);
        ctx.setLineDash([ctx.lineWidth, ctx.lineWidth]);
        ctx.beginPath();
        ctx.moveTo(a.x, mi);
        ctx.lineTo(a.x, ma);
        ctx.moveTo(b.x, mi);
        ctx.lineTo(b.x, ma);
        ctx.stroke();

        ctx.setLineDash([]);
        renderArrow(
          ctx,
          [
            { x: a.x, y: mi },
            { x: b.x, y: mi },
          ],
          arrowSize,
        );
        renderArrow(
          ctx,
          [
            { x: a.x, y: ma },
            { x: b.x, y: ma },
          ],
          arrowSize,
        );
      } else {
        const mi = Math.min(min, a.x, b.x);
        const ma = Math.max(max, a.x, b.x);
        ctx.setLineDash([ctx.lineWidth, ctx.lineWidth]);
        ctx.beginPath();
        ctx.moveTo(mi, a.y);
        ctx.lineTo(ma, a.y);
        ctx.moveTo(mi, b.y);
        ctx.lineTo(ma, b.y);
        ctx.stroke();

        ctx.setLineDash([]);
        renderArrow(
          ctx,
          [
            { x: mi, y: a.y },
            { x: mi, y: b.y },
          ],
          arrowSize,
        );
        renderArrow(
          ctx,
          [
            { x: ma, y: a.y },
            { x: ma, y: b.y },
          ],
          arrowSize,
        );
      }
    });
  });
}

function getSnappingTmpResult(line: [IVec2, IVec2], target: number, clients: number[]): SnappingTmpResult {
  return pickMinItem(
    clients.map((v) => {
      const d = target - v;
      const ad = Math.abs(d);
      return { d, ad, line };
    }),
    (v) => v.ad,
  )!;
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
  for: 0 | 1 | 2; // top/left | middle | button/right
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
  direction: "v" | "h";
}

export function newShapeIntervalSnapping(option: Option) {
  const info = getIntervalSnappingInfo(option.shapeSnappingList);
  const snapThreshold = SNAP_THRESHOLD * (option.scale ?? 1);

  function test(rect: IRectangle): InvervalSnappingResult | undefined {
    const [rectTop, rectRight, rectBottom, rectLeft] = getRectLines(rect);
    const rectW = rect.width;
    const rectH = rect.height;

    let xClosest: [target: IntervalSnappingTarget, d: number, ad: number] | undefined;

    info.v.targets.forEach((target) => {
      const closest = getIntervalSnappingTmpResult(target.v, target.for === 0 ? rectLeft[0].x : rectRight[0].x);
      if (!closest || snapThreshold < closest.ad) return;
      xClosest = xClosest && xClosest[2] <= closest.ad ? xClosest : [target, closest.d, closest.ad];
    });
    info.v.targetFns
      .map((fn) => fn(rectW))
      .forEach((target) => {
        if (!target) return;
        const closest = getIntervalSnappingTmpResult(target.v, rectLeft[0].x);
        if (!closest || snapThreshold < closest.ad) return;
        xClosest = xClosest && xClosest[2] <= closest.ad ? xClosest : [target, closest.d, closest.ad];
      });

    let yClosest: [target: IntervalSnappingTarget, d: number, ad: number] | undefined;

    info.h.targets.forEach((target) => {
      const closest = getIntervalSnappingTmpResult(target.v, target.for === 0 ? rectTop[0].y : rectBottom[0].y);
      if (!closest || snapThreshold < closest.ad) return;
      yClosest = yClosest && yClosest[2] <= closest.ad ? yClosest : [target, closest.d, closest.ad];
    });
    info.h.targetFns
      .map((fn) => fn(rectH))
      .forEach((target) => {
        if (!target) return;
        const closest = getIntervalSnappingTmpResult(target.v, rectTop[0].y);
        if (!closest || snapThreshold < closest.ad) return;
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
          direction: "v",
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
          direction: "h",
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
    if (s0[1].v.length === 0 || s0[1].h.length === 0) continue;

    const l0 = s0[1].v[0];
    const r0 = s0[1].v[s0[1].v.length - 1];
    const t0 = s0[1].h[0];
    const b0 = s0[1].h[s0[1].v.length - 1];

    const hRange: [number, number] = [l0[0].x, r0[0].x];
    const vRange: [number, number] = [t0[0].y, b0[0].y];

    for (let j = 0; j < shapeSnappingList.length; j++) {
      if (i === j) continue;

      const s1 = shapeSnappingList[j];
      if (s1[1].v.length === 0 || s1[1].h.length === 0) continue;

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
            for: 2,
          };
          vList.push(a);
        }

        {
          const v = r1[0].x + d;
          const a: IntervalSnappingTarget = {
            v,
            before: { id: s0[0], vv: [r0[0].x, l1[0].x] },
            after: { id: s1[0], vv: [r1[0].x, v] },
            for: 0,
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
              for: 1,
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
            for: 2,
          };
          hList.push(a);
        }

        {
          const v = b1[0].y + d;
          const a: IntervalSnappingTarget = {
            v,
            before: { id: s0[0], vv: [b0[0].y, t1[0].y] },
            after: { id: s1[0], vv: [b1[0].y, v] },
            for: 0,
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
              for: 1,
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

function getIntervalSnappingTmpResult(target: number, client: number): IntervalSnappingTmpResult {
  const d = target - client;
  const ad = Math.abs(d);
  return { d, ad };
}

export function getSnappingResultForBoundingBoxResizing(
  boundingBoxResizing: BoundingBoxResizing,
  shapeSnapping: ShapeSnapping,
  boundingBoxPath: IVec2[],
  diff: IVec2,
  options?: { keepAspect?: boolean; centralize?: boolean },
): { resizingAffine: AffineMatrix; snappingResult: SnappingResult | undefined } {
  const keepAspect = options?.keepAspect;
  const centralize = options?.centralize;

  // Apply plain resizing
  let resizingAffine = boundingBoxResizing.getAffine(diff, { keepAspect, centralize });

  // Let resized bounding box snap to shapes.
  const snappingResults = boundingBoxPath
    .map((p) => shapeSnapping.testPoint(applyAffine(resizingAffine, p)))
    .filter((r): r is SnappingResult => !!r)
    .sort((a, b) => getNorm(a.diff) - getNorm(b.diff));

  let snappingResult: SnappingResult | undefined;
  if (snappingResults.length > 0) {
    snappingResult = snappingResults[0];
  } else {
    snappingResult = undefined;
  }

  if (snappingResult) {
    const adjustedD = snappingResult ? add(diff, snappingResult.diff) : diff;
    const movingPointInfoList: [IVec2, IVec2][] = boundingBoxPath.map((p) => [p, applyAffine(resizingAffine, p)]);

    // Apply resizing restriction to each snapping candidate
    const results = snappingResult.targets
      .map((target) =>
        boundingBoxResizing.getAffineAfterSnapping(adjustedD, movingPointInfoList, target.line, {
          keepAspect,
          centralize,
        }),
      )
      .filter((r) => r[1] <= shapeSnapping.snapThreshold * 2)
      .sort((a, b) => a[1] - b[1]);

    if (results.length > 0) {
      const result = results[0];
      resizingAffine = result[0];

      if (result[2]) {
        // Pick exact target when it's determined.
        snappingResult = {
          ...snappingResult,
          targets: snappingResult.targets.filter((t) => t.line == result[2]),
        };
      } else if (resizingAffine) {
        // Need recalculation to get final control lines.
        const results = boundingBoxPath
          .map((p) => shapeSnapping.testPoint(applyAffine(resizingAffine, p)))
          .filter((r): r is SnappingResult => !!r)
          .sort((a, b) => getNorm(a.diff) - getNorm(b.diff));
        if (results.length > 0) {
          snappingResult = results[0];
        }
      }
    } else {
      // No snapping result satisfies the resizing restriction or close enough to the cursor.
      snappingResult = undefined;
    }
  }

  return { resizingAffine, snappingResult };
}
