import {
  AffineMatrix,
  IRectangle,
  IVec2,
  MINVALUE,
  add,
  applyAffine,
  getNorm,
  isParallel,
  moveRect,
  rotate,
  sub,
} from "okageo";
import { getCrossLineAndLine, getD2, getRectLines, ISegment, isRangeOverlapped } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { StyleScheme, UserSetting } from "../models";
import { ShapeSnappingLines } from "../shapes/core";
import { renderArrow } from "../utils/renderer";
import { applyFillStyle } from "../utils/fillStyle";
import { pickMinItem } from "../utils/commons";
import { BoundingBoxResizing } from "./boundingBox";

const SNAP_THRESHOLD = 10;
const GRID_ID = "GRID";

export interface SnappingResult extends SnappingTargetInfo {
  diff: IVec2;
}

interface SnappingTargetInfo {
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
  settings?: Pick<UserSetting, "snapIgnoreNonoverlapPair">;
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
  const shapeAndGridSnappingList: [string, ShapeSnappingLines][] = gridSnapping
    ? [[GRID_ID, gridSnapping], ...shapeSnappingList]
    : shapeSnappingList;

  function test(rect: IRectangle, testOption?: TestOption, scale = 1): SnappingResult | undefined {
    const snapThreshold = SNAP_THRESHOLD * scale;
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
          if (!testOption?.disabledEdges.top && !testOption?.disabledEdges.bottom)
            values.push((rectTop[0].y + rectBottom[0].y) / 2);
          if (!testOption?.disabledEdges.top) values.push(rectTop[0].y);
          if (!testOption?.disabledEdges.bottom) values.push(rectBottom[0].y);

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

    const intervalResult = shapeIntervalSnapping.test(rect, scale);

    if (!xClosest && !yClosest && !intervalResult) return;

    const isVInterval =
      (xClosest && intervalResult?.v && intervalResult.v.ad < xClosest[1].ad) || (!xClosest && intervalResult?.v);
    const isHInterval =
      (yClosest && intervalResult?.h && intervalResult.h.ad < yClosest[1].ad) || (!yClosest && intervalResult?.h);
    const dx = isVInterval ? intervalResult.v!.d : (xClosest?.[1].d ?? 0);
    const dy = isHInterval ? intervalResult.h!.d : (yClosest?.[1].d ?? 0);

    const diff = { x: dx, y: dy };
    const [adjustedTop, , , adjustedLeft] = getRectLines(moveRect(rect, diff));
    const targets: SnappingResultTarget[] = [];
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

  /**
   * Proc "test" with two rectangles and merge their results.
   */
  function testWithSubRect(
    rectMain: IRectangle,
    rectSub?: IRectangle,
    option?: TestOption,
    scale = 1,
  ): SnappingResult | undefined {
    const resultMain = test(rectMain, option, scale);
    if (!rectSub) return resultMain;

    const resultSub = test(rectSub, option, scale);
    if (resultMain && resultSub) return mergetSnappingResult(resultMain, resultSub);

    return resultMain ?? resultSub;
  }

  function testPoint(p: IVec2, scale = 1): SnappingResult | undefined {
    const snapThreshold = SNAP_THRESHOLD * scale;
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

    const intervalResult = shapeIntervalSnapping.test({ x: p.x, y: p.y, width: 0, height: 0 }, scale);

    if (!xClosest && !yClosest && !intervalResult) return;

    const isVInterval =
      (xClosest && intervalResult?.v && intervalResult.v.ad < xClosest[1].ad) || (!xClosest && intervalResult?.v);
    const isHInterval =
      (yClosest && intervalResult?.h && intervalResult.h.ad < yClosest[1].ad) || (!yClosest && intervalResult?.h);
    const dx = isVInterval ? intervalResult.v!.d : (xClosest?.[1].d ?? 0);
    const dy = isHInterval ? intervalResult.h!.d : (yClosest?.[1].d ?? 0);

    const diff = { x: dx, y: dy };
    if (getNorm(diff) >= snapThreshold) return;

    const adjustedP = add(p, diff);
    const targets: SnappingResultTarget[] = [];
    const intervalTargets: IntervalSnappingResultTarget[] = [];

    if (isVInterval) {
      const y = (adjustedP.y + adjustedP.y) / 2;
      intervalTargets.push({
        ...intervalResult.v!.target,
        lines: intervalResult.v!.target.lines.map<[IVec2, IVec2]>((l) => [
          { x: l[0].x, y },
          { x: l[1].x, y },
        ]),
      });
    } else if (xClosest) {
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

    if (isHInterval) {
      const x = (adjustedP.x + adjustedP.x) / 2;
      intervalTargets.push({
        ...intervalResult.h!.target,
        lines: intervalResult.h!.target.lines.map<[IVec2, IVec2]>((l) => [
          { x, y: l[0].y },
          { x, y: l[1].y },
        ]),
      });
    } else if (yClosest) {
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

  function testPointOnLine(p: IVec2, guideline: ISegment, scale = 1): SnappingResult | undefined {
    const firstResult = testPoint(p, scale);
    if (!firstResult) return;

    return snapPointOnLine({
      srcP: p,
      snappingResult: firstResult,
      guideline,
      scale,
    });
  }

  return { test, testWithSubRect, testPoint, testPointOnLine };
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

type ShapeIntervalSnappingOption = Option;

export function newShapeIntervalSnapping(option: ShapeIntervalSnappingOption) {
  const info = getIntervalSnappingInfo(option.shapeSnappingList, option.settings?.snapIgnoreNonoverlapPair === "on");

  function test(rect: IRectangle, scale = 1): InvervalSnappingResult | undefined {
    const snapThreshold = SNAP_THRESHOLD * scale;
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
    if (getNorm(diff) >= snapThreshold) return;

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

function getIntervalSnappingInfo(
  shapeSnappingList: [string, ShapeSnappingLines][],
  // When true, pairs of shapes that don't overlap each other are excluded from snapping targets.
  withinRange = false,
): IntervalSnappingInfo {
  const vList: IntervalSnappingTarget[] = [];
  const vFnList: IntervalSnappingTargetFn[] = [];
  const hList: IntervalSnappingTarget[] = [];
  const hFnList: IntervalSnappingTargetFn[] = [];

  for (let i = 0; i < shapeSnappingList.length; i++) {
    const s0 = shapeSnappingList[i];
    if (s0[1].v.length === 0) continue;
    if (withinRange && s0[1].h.length === 0) continue;

    const l0 = s0[1].v[0];
    const r0 = s0[1].v[s0[1].v.length - 1];
    const vRange: [number, number] | undefined = withinRange
      ? [s0[1].h[0][0].y, s0[1].h[s0[1].v.length - 1][0].y]
      : undefined;

    for (let j = 0; j < shapeSnappingList.length; j++) {
      if (i === j) continue;

      const s1 = shapeSnappingList[j];
      if (s1[1].v.length === 0) continue;
      if (vRange) {
        if (s1[1].h.length === 0) continue;
        if (!isRangeOverlapped(vRange, [s1[1].h[0][0].y, s1[1].h[s1[1].h.length - 1][0].y])) continue;
      }

      const l1 = s1[1].v[0];
      const r1 = s1[1].v[s1[1].v.length - 1];

      if (r0[0].x < l1[0].x) {
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
    }
  }

  for (let i = 0; i < shapeSnappingList.length; i++) {
    const s0 = shapeSnappingList[i];
    if (s0[1].h.length === 0) continue;
    if (withinRange && s0[1].v.length === 0) continue;

    const t0 = s0[1].h[0];
    const b0 = s0[1].h[s0[1].h.length - 1];
    const hRange: [number, number] | undefined = withinRange
      ? [s0[1].v[0][0].x, s0[1].v[s0[1].v.length - 1][0].x]
      : undefined;

    for (let j = 0; j < shapeSnappingList.length; j++) {
      if (i === j) continue;

      const s1 = shapeSnappingList[j];
      if (s1[1].h.length === 0) continue;
      if (hRange) {
        if (s1[1].v.length === 0) continue;
        if (!isRangeOverlapped(hRange, [s1[1].v[0][0].x, s1[1].v[s1[1].v.length - 1][0].x])) continue;
      }

      const t1 = s1[1].h[0];
      const b1 = s1[1].h[s1[1].h.length - 1];

      if (b0[0].y < t1[0].y) {
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
  scale = 1,
): { resizingAffine: AffineMatrix; snappingResult: SnappingResult | undefined } {
  const snapThreshold = SNAP_THRESHOLD * scale;
  // Apply plain resizing
  let resizingAffine = boundingBoxResizing.getAffine(diff, options);

  // Let resized bounding box snap to shapes.
  const snappingResults = boundingBoxPath
    .map((p) => shapeSnapping.testPoint(applyAffine(resizingAffine, p)))
    .filter((r): r is SnappingResult => !!r)
    .sort((a, b) => getNorm(a.diff) - getNorm(b.diff));
  if (snappingResults.length === 0) return { resizingAffine, snappingResult: undefined };

  let snappingResult = snappingResults[0];
  const adjustedD = snappingResult ? add(diff, snappingResult.diff) : diff;
  const movingPointInfoList: [IVec2, IVec2][] = boundingBoxPath.map((p) => [p, applyAffine(resizingAffine, p)]);
  const guidelines = getGuidelinesFromSnappingResult(snappingResult);

  // Apply resizing restriction to each snapping candidate
  const result = pickMinItem(
    guidelines
      .map((guideline) =>
        boundingBoxResizing.getAffineAfterSnapping(adjustedD, movingPointInfoList, guideline, options),
      )
      .filter((r): r is Exclude<typeof r, undefined> => !!r && r[1] <= snapThreshold * 2),
    (r) => r[1],
  );
  // No snapping result satisfies the resizing restriction or close enough to the cursor.
  if (!result) return { resizingAffine, snappingResult: undefined };

  resizingAffine = result[0];

  if (result[2]) {
    // Pick exact target when it's determined.
    snappingResult = {
      ...snappingResult,
      ...filterSnappingTargetsBySecondGuideline(snappingResult, result[2]),
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

  return { resizingAffine, snappingResult };
}

function snapPointOnLine({
  srcP,
  snappingResult,
  guideline,
  scale,
}: {
  srcP: IVec2;
  snappingResult: SnappingResult;
  guideline: ISegment;
  scale: number;
}): SnappingResult | undefined {
  const snapThreshold = SNAP_THRESHOLD * scale;
  const guidelineVec = sub(guideline[1], guideline[0]);
  const candidateInfo = getSecondGuidelineCandidateInfo(snappingResult, guidelineVec);

  const closestInfo = pickMinItem(
    candidateInfo.candidates.map((seg) => {
      const intersection = getCrossLineAndLine(seg, guideline);
      if (!intersection) return;
      const d2 = getD2(sub(srcP, intersection));
      return [seg, intersection, d2] as const;
    }),
    (info) => info?.[2] ?? Infinity,
  );
  if (!closestInfo) return;

  const [secondGuideline, snappedP] = closestInfo;
  const diff = sub(snappedP, srcP);
  if (getNorm(diff) >= snapThreshold) return;

  return {
    diff,
    ...optimizeSnappingTargetInfoForPoint(
      filterSnappingTargetsBySecondGuideline(candidateInfo, secondGuideline),
      snappedP,
    ),
  };
}

export function optimizeSnappingTargetInfoForPoint(src: SnappingTargetInfo, p: IVec2): SnappingTargetInfo {
  return {
    // Guidelines of "targets" have no room for optimization
    // because the snapped point isn't always a vertex of the guideline.
    // e.g. When the guideline is grid line, the snapped point is almost always inner point of the guideline.
    targets: src.targets,
    // Guidelines of "intervalTargets" can be optimized
    // because they only fix one coordinate.
    intervalTargets: src.intervalTargets.map((it) => {
      const horizontal = it.direction === "h";
      const fn = horizontal ? (v: IVec2) => ({ x: p.x, y: v.y }) : (v: IVec2) => ({ x: v.x, y: p.y });
      return { ...it, lines: it.lines.map((l) => l.map(fn) as ISegment) };
    }),
  };
}

export function getSecondGuidelineCandidateInfo(
  snappingResult: SnappingResult,
  guidelineVec: IVec2,
): SnappingTargetInfo & { candidates: ISegment[] } {
  const candidateTargets = snappingResult.targets.filter((t) => !isParallel(sub(t.line[1], t.line[0]), guidelineVec));

  // "lines" of "intervalTargets" represent the gaps between shapes.
  // => Perpendicular lines at vertices are the guideline candidates.
  const perpendicularVec = rotate(guidelineVec, Math.PI / 2);
  const candidateIntervals = snappingResult.intervalTargets.filter(
    (t) => t.lines.length > 0 && !isParallel(sub(t.lines[0][1], t.lines[0][0]), perpendicularVec),
  );

  const allCandidates: ISegment[] = candidateTargets.map((t) => t.line);
  candidateIntervals.forEach((t) =>
    t.lines.forEach((l) => {
      const v = rotate(sub(l[1], l[0]), Math.PI / 2);
      allCandidates.push([l[0], add(l[0], v)], [l[1], add(l[1], v)]);
    }),
  );

  const partial = { targets: candidateTargets, intervalTargets: candidateIntervals };
  return { candidates: getGuidelinesFromSnappingResult(partial), ...partial };
}

export function getGuidelinesFromSnappingResult(snappingResult: SnappingTargetInfo): ISegment[] {
  const allCandidates: ISegment[] = snappingResult.targets.map((t) => t.line);
  snappingResult.intervalTargets.forEach((t) =>
    t.lines.forEach((l) => {
      const v = rotate(sub(l[1], l[0]), Math.PI / 2);
      allCandidates.push([l[0], add(l[0], v)], [l[1], add(l[1], v)]);
    }),
  );

  return allCandidates;
}

export function filterSnappingTargetsBySecondGuideline(
  snappingResult: SnappingTargetInfo,
  secondGuideline: ISegment,
): SnappingTargetInfo {
  const v = sub(secondGuideline[1], secondGuideline[0]);
  const perpendicularV = rotate(v, Math.PI / 2);
  return {
    targets: snappingResult.targets.filter((t) => isParallel(sub(t.line[1], t.line[0]), v)),
    intervalTargets: snappingResult.intervalTargets.filter(
      (t) => t.lines.length > 0 && isParallel(sub(t.lines[0][1], t.lines[0][0]), perpendicularV),
    ),
  };
}

export function mergetSnappingResult(a: SnappingResult, b: SnappingResult): SnappingResult {
  // Filter guildelines for x-axis.
  const infoAX = getSecondGuidelineCandidateInfo(a, { x: 1, y: 0 });
  const infoBX = getSecondGuidelineCandidateInfo(b, { x: 1, y: 0 });
  let diffX = a.diff.x;
  let infoX = infoAX;
  if (infoAX.targets.length > 0 || infoAX.intervalTargets.length > 0) {
    if (infoBX.targets.length > 0 || infoBX.intervalTargets.length > 0) {
      // When both results have guidelines, pick one having smaller diff.
      if (Math.abs(a.diff.x) > Math.abs(b.diff.x)) {
        diffX = b.diff.x;
        infoX = infoBX;
      }
    }
  } else {
    diffX = b.diff.x;
    infoX = infoBX;
  }

  // Parallel to x-axis.
  const infoAY = getSecondGuidelineCandidateInfo(a, { x: 0, y: 1 });
  const infoBY = getSecondGuidelineCandidateInfo(b, { x: 0, y: 1 });
  let diffY = a.diff.y;
  let infoY = infoAY;
  if (infoAY.targets.length > 0 || infoAY.intervalTargets.length > 0) {
    if (infoBY.targets.length > 0 || infoBY.intervalTargets.length > 0) {
      if (Math.abs(a.diff.y) > Math.abs(b.diff.y)) {
        diffY = b.diff.y;
        infoY = infoBY;
      }
    }
  } else {
    diffY = b.diff.y;
    infoY = infoBY;
  }

  return {
    diff: { x: diffX, y: diffY },
    targets: [...infoX.targets, ...infoY.targets],
    intervalTargets: [...infoX.intervalTargets, ...infoY.intervalTargets],
  };
}
