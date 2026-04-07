import {
  AffineMatrix,
  IRectangle,
  IVec2,
  MINVALUE,
  add,
  applyAffine,
  getCross,
  getInner,
  isOnLine,
  isParallel,
  moveRect,
  rotate,
  sub,
} from "okageo";
import {
  getCrossLineAndLine,
  getD2,
  getRectLines,
  ISegment,
  isRangeOverlapped,
  isSameValue,
  isWithinRange,
  TAU,
} from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { StyleScheme, UserSetting } from "../models";
import { ShapeSnappingLines } from "../shapes/core";
import { applyCurvePath, renderArrow } from "../utils/renderer";
import { applyFillStyle } from "../utils/fillStyle";
import { forEachBackward, pickMinItem } from "../utils/commons";
import { BoundingBoxResizing } from "./boundingBox";
import { CanvasCTX } from "../utils/types";
import { BezierPath } from "../utils/path";

export const SNAP_THRESHOLD = 10;
const GRID_ID = "GRID";

export interface SnappingTestTarget {
  rect: IRectangle;
  outlinePoints?: IVec2[];
}

export interface SnappingResult extends SnappingTargetInfo {
  diff: IVec2;
  anchorPoints: IVec2[];
}

interface SnappingTargetInfo {
  targets: SnappingResultTarget[];
  intervalTargets: IntervalSnappingResultTarget[];
}

interface SnappingResultTarget {
  id: string;
  line: [IVec2, IVec2];
  // When true, the snapped anchor is on the infinite extension of this line but outside its segment extent.
  // Such lines are included for visual highlighting but excluded from guideline computations.
  outOfRange?: true;
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

export function newShapeSnapping(option: Option) {
  const shapeSnappingList = option.shapeSnappingList;
  const gridSnapping = option.gridSnapping;
  const shapeIntervalSnapping = newShapeIntervalSnapping(option);
  const shapeAndGridSnappingList: [string, ShapeSnappingLines][] = gridSnapping
    ? [[GRID_ID, gridSnapping], ...shapeSnappingList]
    : shapeSnappingList;

  function test(target: SnappingTestTarget, scale = 1): SnappingResult | undefined {
    const rect = target.rect;
    const snapThreshold = SNAP_THRESHOLD * scale;
    const anchorPoints = target.outlinePoints
      ? [...getRectAnchorPoints(rect), ...target.outlinePoints]
      : getRectAnchorPoints(rect);

    // Build the interval line map: each virtual ISegment maps to its raw interval data.
    type IntervalLineData = {
      rawTarget: IntervalSnappingTarget;
      direction: "v" | "h";
      referenceAnchor: IVec2;
    };
    const intervalLineMap = new Map<ISegment, IntervalLineData>();
    const intervalSnappingLines: ShapeSnappingLines = { linesByRotation: new Map() };
    const intervalRotations = [0, Math.PI / 2] as const;
    shapeIntervalSnapping.getCandidates(rect).forEach((candidate) => {
      intervalLineMap.set(candidate.seg, {
        rawTarget: candidate.rawTarget,
        direction: candidate.direction,
        referenceAnchor: candidate.referenceAnchor,
      });
      const rotation = intervalRotations[candidate.direction === "v" ? 1 : 0];
      const existing = intervalSnappingLines.linesByRotation.get(rotation);
      if (existing) {
        existing.push(candidate.seg);
      } else {
        intervalSnappingLines.linesByRotation.set(rotation, [candidate.seg]);
      }
    });

    // Unified pool: interval lines participate alongside shape/grid lines.
    const allSnappingList: [string, ShapeSnappingLines][] = shapeAndGridSnappingList.slice();
    if (intervalLineMap.size > 0) {
      allSnappingList.unshift(["INTERVAL", intervalSnappingLines]);
    }

    // --- Phase 1: find the globally closest snap line across all rotations ---
    // On ties, prefer the line whose anchor falls within the segment's range (avoids including wrong
    // line among adjacent overlapping segments such as two touching shape boundaries).
    type PrimarySnap = { rotation: number; id: string; line: ISegment; d: number; ad: number; anchorInRange: boolean };
    let primary: PrimarySnap | undefined;

    for (const [id, lines] of allSnappingList) {
      for (const [rotation, rotLines] of lines.linesByRotation) {
        const lineDir = getLineDir(rotation);
        for (const line of rotLines) {
          const lineProj = getCross(lineDir, line[0]);
          const l0p = getInner(line[0], lineDir);
          const l1p = getInner(line[1], lineDir);
          const minLP = Math.min(l0p, l1p);
          const maxLP = Math.max(l0p, l1p);
          const intervalLineData = intervalLineMap.get(line);
          const lineAnchors = intervalLineData ? [intervalLineData.referenceAnchor] : anchorPoints;
          for (const anchor of lineAnchors) {
            const d = lineProj - getCross(lineDir, anchor);
            const ad = Math.abs(d);
            if (ad >= snapThreshold) continue;
            const pp = getInner(anchor, lineDir);
            const anchorInRange = !!intervalLineData || isWithinRange(minLP, maxLP, pp, MINVALUE);
            if (!primary || ad < primary.ad || (ad === primary.ad && anchorInRange && !primary.anchorInRange)) {
              primary = { rotation, id, line, d, ad, anchorInRange };
            }
          }
        }
      }
    }

    if (!primary) return;

    const r1 = primary.rotation;
    const d1 = getLineDir(r1);
    // Normal of r1 is the 90° CCW rotation of d1: (-d1.y, d1.x)
    const v1 = { x: primary.d * -d1.y, y: primary.d * d1.x };
    // --- Phase 2: find the best secondary snap via guide-line intersection ---
    // For each non-parallel secondary line, draw a guide through each anchor (after v1)
    // in direction d1, and find the closest intersection.
    // On ties, prefer the line whose anchor (after v1) falls within the segment's range.
    type SecondarySnap = {
      rotation: number;
      id: string;
      line: ISegment;
      t: number;
      at: number;
      anchorInRange: boolean;
    };
    let secondary: SecondarySnap | undefined;

    for (const [id, lines] of allSnappingList) {
      for (const [rotation, rotLines] of lines.linesByRotation) {
        if (rotation === r1) continue;
        const lineDir2 = getLineDir(rotation);
        // denom = cross(lineDir2, d1) = dir(r1) · normal(r2); zero means lines are parallel
        const denom = getCross(lineDir2, d1);
        if (isSameValue(denom, 0)) continue;

        for (const line of rotLines) {
          const lineProj = getCross(lineDir2, line[0]);
          const l0p2 = getInner(line[0], lineDir2);
          const l1p2 = getInner(line[1], lineDir2);
          const minLP2 = Math.min(l0p2, l1p2);
          const maxLP2 = Math.max(l0p2, l1p2);
          const intervalLineData = intervalLineMap.get(line);
          const lineAnchors = intervalLineData ? [intervalLineData.referenceAnchor] : anchorPoints;
          for (const anchor of lineAnchors) {
            const pPrime = add(anchor, v1);
            const t = (lineProj - getCross(lineDir2, pPrime)) / denom;
            const at = Math.abs(t);
            if (at >= snapThreshold) continue;
            const pp2 = getInner(pPrime, lineDir2);
            const anchorInRange = !!intervalLineData || isWithinRange(minLP2, maxLP2, pp2, MINVALUE);
            if (!secondary || at < secondary.at || (at === secondary.at && anchorInRange && !secondary.anchorInRange)) {
              secondary = { rotation, id, line, t, at, anchorInRange };
            }
          }
        }
      }
    }

    const v2 = secondary ? { x: secondary.t * d1.x, y: secondary.t * d1.y } : { x: 0, y: 0 };
    const diff = add(v1, v2);
    if (getD2(diff) >= 2 * snapThreshold * snapThreshold) return;

    // --- Phase 3: collect all lines that any snapped anchor point lands on ---
    const snappedAnchors = anchorPoints.map((p) => add(p, diff));
    type LandingEntry = {
      rotation: number;
      id: string;
      line: ISegment;
      intervalData: IntervalLineData | undefined;
      outOfRange: true | undefined;
    };
    const landingEntries: LandingEntry[] = [];
    const snappedRect = moveRect(rect, diff);
    const [snappedTop, , , snappedLeft] = getRectLines(snappedRect);
    // Primary and secondary snap lines always land on the anchor by construction (even if outside extent).
    const snapLines = new Set<ISegment>([primary.line, ...(secondary ? [secondary.line] : [])]);

    // Iterate in reverse so higher-findex shapes (added later to the list) appear first in landingEntries,
    // which ensures seekConnecionAt picks the "top" shape when multiple shapes share a boundary.
    forEachBackward(allSnappingList, ([id, lines]) => {
      for (const [rotation, rotLines] of lines.linesByRotation) {
        const lineDir = getLineDir(rotation);
        const snappedCross = snappedAnchors.map((p) => getCross(lineDir, p));
        const snappedInner = snappedAnchors.map((p) => getInner(p, lineDir));
        for (const line of rotLines) {
          const lineProj = getCross(lineDir, line[0]);
          const isSnapLine = snapLines.has(line);
          const intervalData = intervalLineMap.get(line);
          const isInterval = !!intervalData;
          const l0p = getInner(line[0], lineDir);
          const l1p = getInner(line[1], lineDir);
          const [minLP, maxLP] = l0p <= l1p ? [l0p, l1p] : [l1p, l0p];
          let projectionMatch = false;
          let inRange = false;
          for (let i = 0; i < snappedAnchors.length; i++) {
            if (Math.abs(snappedCross[i] - lineProj) >= MINVALUE) continue;
            projectionMatch = true;
            if (isSnapLine || isInterval) {
              inRange = true;
              break;
            }
            if (isWithinRange(minLP, maxLP, snappedInner[i], MINVALUE)) {
              inRange = true;
              break;
            }
          }
          if (!projectionMatch) continue;
          landingEntries.push({
            rotation,
            id,
            line,
            intervalData,
            outOfRange: inRange ? undefined : true,
          });
        }
      }
    });

    // Sort landing entries by rotation descending so that vertical lines (π/2) come before horizontal (0).
    // TODO: Not for sure if this sort is essential for the logic
    landingEntries.sort((a, b) => b.rotation - a.rotation);

    const targets: SnappingResultTarget[] = [];
    const intervalTargets: IntervalSnappingResultTarget[] = [];
    for (const { rotation, id, line, intervalData, outOfRange } of landingEntries) {
      if (intervalData) {
        if (intervalData.direction === "v") {
          const y = (snappedLeft[0].y + snappedLeft[1].y) / 2;
          const { beforeVV, afterVV } = intervalData.rawTarget;
          intervalTargets.push({
            pairs: intervalData.rawTarget.pairs,
            lines: [
              [
                { x: beforeVV[0], y },
                { x: beforeVV[1], y },
              ],
              [
                { x: afterVV[0], y },
                { x: afterVV[1], y },
              ],
            ],
            direction: "v",
          });
        } else {
          const x = (snappedTop[0].x + snappedTop[1].x) / 2;
          const { beforeVV, afterVV } = intervalData.rawTarget;
          intervalTargets.push({
            pairs: intervalData.rawTarget.pairs,
            lines: [
              [
                { x, y: beforeVV[0] },
                { x, y: beforeVV[1] },
              ],
              [
                { x, y: afterVV[0] },
                { x, y: afterVV[1] },
              ],
            ],
            direction: "h",
          });
        }
      } else {
        const target: SnappingResultTarget = { id, line: getSnappingTargetLine(line, snappedAnchors, rotation) };
        if (outOfRange) target.outOfRange = true;
        targets.push(target);
      }
    }

    const seenKeys = new Set<string>();
    const landingAnchors = snappedAnchors.filter((p) => {
      const key = `${p.x},${p.y}`;
      if (seenKeys.has(key)) return false;
      const matches = landingEntries.some(({ rotation, line }) => {
        const ld = getLineDir(rotation);
        return isSameValue(getCross(ld, p), getCross(ld, line[0]));
      });
      if (matches) seenKeys.add(key);
      return matches;
    });
    return { targets, intervalTargets, diff, anchorPoints: landingAnchors };
  }

  /**
   * Proc "test" with two targets and pick the result with the smaller snap diff.
   * Note: Since the guid lines can be non-orthogonal, combining the two results as the optimal one is too complicated and unpredictable.
   */
  function testWithSubRect(main: SnappingTestTarget, sub?: SnappingTestTarget, scale = 1): SnappingResult | undefined {
    const resultMain = test(main, scale);
    if (!sub) return resultMain;

    const resultSub = test(sub, scale);
    if (resultMain && resultSub) return getD2(resultMain.diff) <= getD2(resultSub.diff) ? resultMain : resultSub;

    return resultMain ?? resultSub;
  }

  function testPoint(p: IVec2, scale = 1): SnappingResult | undefined {
    return test({ rect: { x: p.x, y: p.y, width: 0, height: 0 } }, scale);
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

/**
 * For horizontal or vertical snappings, rectangular check looks more natural than circular check.
 */
function isWithinRectThreshold(v: IVec2, threshold: number): boolean {
  if (Math.abs(v.x) >= threshold) return false;
  if (Math.abs(v.y) >= threshold) return false;
  return true;
}

export interface SnappingTargetShape {
  highlightPaths: BezierPath[];
  wrapperRect: IRectangle;
}

export function renderSnappingResult(
  ctx: CanvasCTX,
  option: {
    result: SnappingResult;
    style: StyleScheme;
    scale: number;
    getTargetShape?: (id: string) => SnappingTargetShape | undefined;
  },
) {
  const getTargetShape = option.getTargetShape;

  const allTargetIdSet = new Set(option.result.targets.map((t) => t.id));
  option.result.intervalTargets.forEach((info) => {
    info.pairs.forEach(([beforeId, afterId]) => {
      allTargetIdSet.add(beforeId);
      allTargetIdSet.add(afterId);
    });
  });

  if (getTargetShape && allTargetIdSet.size > 0) {
    applyStrokeStyle(ctx, {
      color: option.style.selectionSecondaly,
      width: option.style.selectionLineWidth * option.scale,
    });
    allTargetIdSet.forEach((id) => {
      const info = getTargetShape(id);
      if (!info?.highlightPaths.length) return;
      ctx.beginPath();
      info.highlightPaths.forEach((p) => applyCurvePath(ctx, p.path, p.curves));
      ctx.stroke();
    });
  }

  applyStrokeStyle(ctx, { color: option.style.selectionPrimary, width: 2 * option.scale });
  applyFillStyle(ctx, { color: option.style.selectionPrimary });

  const snappingLines = option.result.targets.map((t) => t.line) ?? [];
  ctx.beginPath();
  snappingLines.forEach(([a, b]) => {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  });
  ctx.stroke();

  const dotRadius = 5 * option.scale;
  option.result.anchorPoints.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, dotRadius, 0, TAU);
    ctx.fill();
  });

  if (!getTargetShape) return;

  const arrowSize = 10 * option.scale;

  option.result.intervalTargets?.forEach((t) => {
    const isV = t.direction === "v";
    let min = Infinity;
    let max = -Infinity;
    t.pairs.forEach(([beforeId, afterId]) => {
      const before = getTargetShape(beforeId)?.wrapperRect;
      const after = getTargetShape(afterId)?.wrapperRect;
      if (!before || !after) return;
      min = Math.min(min, !isV ? Math.min(before.x, after.x) : Math.min(before.y, after.y));
      max = Math.max(
        max,
        !isV
          ? Math.max(before.x + before.width, after.x + after.width)
          : Math.max(before.y + before.height, after.y + after.height),
      );
    });
    if (min === Infinity) return;

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

/**
 * Returns the unit direction vector along a line at the given rotation.
 * Uses exact values for the standard angles 0 and Math.PI / 2 to avoid floating-point drift.
 */
function getLineDir(rotation: number): IVec2 {
  if (rotation === 0) return { x: 1, y: 0 };
  if (rotation === Math.PI / 2) return { x: 0, y: 1 };
  return { x: Math.cos(rotation), y: Math.sin(rotation) };
}

function getRectAnchorPoints(rect: IRectangle): IVec2[] {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  return [
    { x: rect.x, y: rect.y },
    { x: right, y: rect.y },
    { x: rect.x, y: bottom },
    { x: right, y: bottom },
    { x: cx, y: cy },
  ];
}

/**
 * Build a guide line segment along the given rotation direction,
 * spanning both the snap line and the anchor points.
 */
function getSnappingTargetLine(snapLine: ISegment, anchorPoints: IVec2[], rotation: number): ISegment {
  const lineDir = getLineDir(rotation);
  const origin = snapLine[0];
  const projections = [...anchorPoints, snapLine[0], snapLine[1]].map((p) =>
    getInner({ x: p.x - origin.x, y: p.y - origin.y }, lineDir),
  );
  const minP = Math.min(...projections);
  const maxP = Math.max(...projections);
  return [
    { x: origin.x + minP * lineDir.x, y: origin.y + minP * lineDir.y },
    { x: origin.x + maxP * lineDir.x, y: origin.y + maxP * lineDir.y },
  ];
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
  pairs: [beforeId: string, afterId: string][];
  beforeVV: [from: number, to: number];
  afterVV: [from: number, to: number];
  v: number;
  for: 0 | 1 | 2; // top/left | middle | bottom/right
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
  pairs: [beforeId: string, afterId: string][];
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
    if (!isWithinRectThreshold(diff, snapThreshold)) return;

    const [adjustedTop, , , adjustedLeft] = getRectLines(moveRect(rect, diff));
    const ret: InvervalSnappingResult = {};

    if (xClosest) {
      const info = xClosest[0];
      const y = (adjustedLeft[0].y + adjustedLeft[1].y) / 2;
      ret.v = {
        d: diff.x,
        ad: Math.abs(diff.x),
        target: {
          pairs: info.pairs,
          lines: [
            [
              { x: info.beforeVV[0], y },
              { x: info.beforeVV[1], y },
            ],
            [
              { x: info.afterVV[0], y },
              { x: info.afterVV[1], y },
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
          pairs: info.pairs,
          lines: [
            [
              { x, y: info.beforeVV[0] },
              { x, y: info.beforeVV[1] },
            ],
            [
              { x, y: info.afterVV[0] },
              { x, y: info.afterVV[1] },
            ],
          ],
          direction: "h",
        },
      };
    }

    return ret.v || ret.h ? ret : undefined;
  }

  function getCandidates(rect: IRectangle): {
    seg: ISegment;
    rawTarget: IntervalSnappingTarget;
    direction: "v" | "h";
    referenceAnchor: IVec2;
  }[] {
    const [rectTop, , rectBottom, rectLeft] = getRectLines(rect);
    const rectW = rect.width;
    const rectH = rect.height;
    const results: {
      seg: ISegment;
      rawTarget: IntervalSnappingTarget;
      direction: "v" | "h";
      referenceAnchor: IVec2;
    }[] = [];

    info.v.targets.forEach((target) => {
      const refX = target.for === 0 ? rectLeft[0].x : rectLeft[0].x + rectW;
      results.push({
        seg: [
          { x: target.v, y: 0 },
          { x: target.v, y: 1 },
        ],
        rawTarget: target,
        direction: "v",
        referenceAnchor: { x: refX, y: rectLeft[0].y },
      });
    });

    info.v.targetFns
      .map((fn) => fn(rectW))
      .forEach((target) => {
        if (!target) return;
        results.push({
          seg: [
            { x: target.v, y: 0 },
            { x: target.v, y: 1 },
          ],
          rawTarget: target,
          direction: "v",
          referenceAnchor: { x: rectLeft[0].x, y: rectLeft[0].y },
        });
      });

    info.h.targets.forEach((target) => {
      const refY = target.for === 0 ? rectTop[0].y : rectBottom[0].y;
      results.push({
        seg: [
          { x: 0, y: target.v },
          { x: 1, y: target.v },
        ],
        rawTarget: target,
        direction: "h",
        referenceAnchor: { x: rectTop[0].x, y: refY },
      });
    });

    info.h.targetFns
      .map((fn) => fn(rectH))
      .forEach((target) => {
        if (!target) return;
        results.push({
          seg: [
            { x: 0, y: target.v },
            { x: 1, y: target.v },
          ],
          rawTarget: target,
          direction: "h",
          referenceAnchor: { x: rectTop[0].x, y: rectTop[0].y },
        });
      });

    return results;
  }

  return { test, getCandidates };
}
export type ShapeIntervalSnapping = ReturnType<typeof newShapeIntervalSnapping>;

function getIntervalSnappingInfo(
  shapeSnappingList: [string, ShapeSnappingLines][],
  // When true, pairs of shapes that don't overlap each other are excluded from snapping targets.
  withinRange = false,
): IntervalSnappingInfo {
  const vMap = new Map<string, IntervalSnappingTarget>();
  const vFnMap = new Map<string, { s0id: string; s1id: string }[]>();
  const hMap = new Map<string, IntervalSnappingTarget>();
  const hFnMap = new Map<string, { s0id: string; s1id: string }[]>();

  for (let i = 0; i < shapeSnappingList.length; i++) {
    const s0 = shapeSnappingList[i];
    const s0v = s0[1].linesByRotation.get(Math.PI / 2) ?? [];
    const s0h = s0[1].linesByRotation.get(0) ?? [];
    if (s0v.length === 0) continue;
    if (withinRange && s0h.length === 0) continue;

    const l0 = s0v[0];
    const r0 = s0v[s0v.length - 1];
    const vRange: [number, number] | undefined = withinRange ? [s0h[0][0].y, s0h[s0h.length - 1][0].y] : undefined;

    for (let j = 0; j < shapeSnappingList.length; j++) {
      if (i === j) continue;

      const s1 = shapeSnappingList[j];
      const s1v = s1[1].linesByRotation.get(Math.PI / 2) ?? [];
      const s1h = s1[1].linesByRotation.get(0) ?? [];
      if (s1v.length === 0) continue;
      if (vRange) {
        if (s1h.length === 0) continue;
        if (!isRangeOverlapped(vRange, [s1h[0][0].y, s1h[s1h.length - 1][0].y])) continue;
      }

      const l1 = s1v[0];
      const r1 = s1v[s1v.length - 1];

      if (r0[0].x < l1[0].x) {
        const d = l1[0].x - r0[0].x;

        {
          const v = l0[0].x - d;
          const beforeVV: [number, number] = [v, l0[0].x];
          const afterVV: [number, number] = [r0[0].x, l1[0].x];
          const key = toIntervalKey(2, beforeVV, afterVV);
          const existing = vMap.get(key);
          if (existing) {
            existing.pairs.push([s0[0], s1[0]]);
          } else {
            vMap.set(key, { v, beforeVV, afterVV, pairs: [[s0[0], s1[0]]], for: 2 });
          }
        }

        {
          const v = r1[0].x + d;
          const beforeVV: [number, number] = [r0[0].x, l1[0].x];
          const afterVV: [number, number] = [r1[0].x, v];
          const key = toIntervalKey(0, beforeVV, afterVV);
          const existing = vMap.get(key);
          if (existing) {
            existing.pairs.push([s0[0], s1[0]]);
          } else {
            vMap.set(key, { v, beforeVV, afterVV, pairs: [[s0[0], s1[0]]], for: 0 });
          }
        }

        {
          const r0x = r0[0].x;
          const l1x = l1[0].x;
          const fnKey = `${r0x.toFixed(10)}:${l1x.toFixed(10)}`;
          const existing = vFnMap.get(fnKey);
          if (existing) {
            existing.push({ s0id: s0[0], s1id: s1[0] });
          } else {
            vFnMap.set(fnKey, [{ s0id: s0[0], s1id: s1[0] }]);
          }
        }
      }
    }
  }

  for (let i = 0; i < shapeSnappingList.length; i++) {
    const s0 = shapeSnappingList[i];
    const s0v = s0[1].linesByRotation.get(Math.PI / 2) ?? [];
    const s0h = s0[1].linesByRotation.get(0) ?? [];
    if (s0h.length === 0) continue;
    if (withinRange && s0v.length === 0) continue;

    const t0 = s0h[0];
    const b0 = s0h[s0h.length - 1];
    const hRange: [number, number] | undefined = withinRange ? [s0v[0][0].x, s0v[s0v.length - 1][0].x] : undefined;

    for (let j = 0; j < shapeSnappingList.length; j++) {
      if (i === j) continue;

      const s1 = shapeSnappingList[j];
      const s1v = s1[1].linesByRotation.get(Math.PI / 2) ?? [];
      const s1h = s1[1].linesByRotation.get(0) ?? [];
      if (s1h.length === 0) continue;
      if (hRange) {
        if (s1v.length === 0) continue;
        if (!isRangeOverlapped(hRange, [s1v[0][0].x, s1v[s1v.length - 1][0].x])) continue;
      }

      const t1 = s1h[0];
      const b1 = s1h[s1h.length - 1];

      if (b0[0].y < t1[0].y) {
        const d = t1[0].y - b0[0].y;

        {
          const v = t0[0].y - d;
          const beforeVV: [number, number] = [v, t0[0].y];
          const afterVV: [number, number] = [b0[0].y, t1[0].y];
          const key = toIntervalKey(2, beforeVV, afterVV);
          const existing = hMap.get(key);
          if (existing) {
            existing.pairs.push([s0[0], s1[0]]);
          } else {
            hMap.set(key, { v, beforeVV, afterVV, pairs: [[s0[0], s1[0]]], for: 2 });
          }
        }

        {
          const v = b1[0].y + d;
          const beforeVV: [number, number] = [b0[0].y, t1[0].y];
          const afterVV: [number, number] = [b1[0].y, v];
          const key = toIntervalKey(0, beforeVV, afterVV);
          const existing = hMap.get(key);
          if (existing) {
            existing.pairs.push([s0[0], s1[0]]);
          } else {
            hMap.set(key, { v, beforeVV, afterVV, pairs: [[s0[0], s1[0]]], for: 0 });
          }
        }

        {
          const b0y = b0[0].y;
          const t1y = t1[0].y;
          const fnKey = `${b0y.toFixed(10)}:${t1y.toFixed(10)}`;
          const existing = hFnMap.get(fnKey);
          if (existing) {
            existing.push({ s0id: s0[0], s1id: s1[0] });
          } else {
            hFnMap.set(fnKey, [{ s0id: s0[0], s1id: s1[0] }]);
          }
        }
      }
    }
  }

  const vFnList: IntervalSnappingTargetFn[] = [];
  vFnMap.forEach((entries, fnKey) => {
    const [r0x, l1x] = fnKey.split(":").map(Number);
    const d = l1x - r0x;
    vFnList.push((size) => {
      const margin = d - size;
      if (margin <= 0) return;
      const v = r0x + margin / 2;
      return {
        v,
        beforeVV: [r0x, v],
        afterVV: [v + size, l1x],
        pairs: entries.map((e) => [e.s0id, e.s1id] as [string, string]),
        for: 1,
      };
    });
  });

  const hFnList: IntervalSnappingTargetFn[] = [];
  hFnMap.forEach((entries, fnKey) => {
    const [b0y, t1y] = fnKey.split(":").map(Number);
    const d = t1y - b0y;
    hFnList.push((size) => {
      const margin = d - size;
      if (margin <= 0) return;
      const v = b0y + margin / 2;
      return {
        v,
        beforeVV: [b0y, v],
        afterVV: [v + size, t1y],
        pairs: entries.map((e) => [e.s0id, e.s1id] as [string, string]),
        for: 1,
      };
    });
  });

  return {
    v: {
      targets: Array.from(vMap.values()),
      targetFns: vFnList,
    },
    h: {
      targets: Array.from(hMap.values()),
      targetFns: hFnList,
    },
  };
}

function toIntervalKey(forVal: number, bvv: [number, number], avv: [number, number]): string {
  return [forVal, bvv[0], bvv[1], avv[0], avv[1]].map((n) => n.toFixed(10)).join(":");
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
    .map((p) => shapeSnapping.testPoint(applyAffine(resizingAffine, p), scale))
    .filter((r): r is SnappingResult => !!r);
  let snappingResult = pickMinItem(snappingResults, (a) => getD2(a.diff));
  if (!snappingResult) return { resizingAffine, snappingResult: undefined };

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

  const snappedPath = boundingBoxPath.map((p) => applyAffine(resizingAffine, p));
  if (result[2]) {
    // Pick exact target when it's determined.
    // Pick snapped bounding box points that land on the snapping guideline as anchor points.
    const anchorPoints = snappedPath.filter((p) => isOnLine(p, result[2]!));
    snappingResult = {
      ...snappingResult,
      ...filterSnappingTargetsBySecondGuideline(snappingResult, result[2]),
      anchorPoints,
    };
  } else if (resizingAffine) {
    // Need recalculation to get final control lines.
    const results = snappedPath.map((p) => shapeSnapping.testPoint(p, scale)).filter((r): r is SnappingResult => !!r);
    snappingResult = pickMinItem(results, (a) => getD2(a.diff)) ?? snappingResult;
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
  if (!isWithinRectThreshold(diff, snapThreshold)) return;

  return {
    diff,
    anchorPoints: [snappedP],
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

export function getGuidelinesFromSnappingResult(snappingResult: SnappingTargetInfo, filterAt?: IVec2): ISegment[] {
  // Exclude out-of-range targets: they are snapped onto the infinite extension of a line but outside its
  // segment extent. They are shown for visual reference only, not used for guideline intersection logic.
  const allCandidates: ISegment[] = snappingResult.targets.filter((t) => !t.outOfRange).map((t) => t.line);
  snappingResult.intervalTargets.forEach((t) =>
    t.lines.forEach((l) => {
      const v = rotate(sub(l[1], l[0]), Math.PI / 2);
      allCandidates.push([l[0], add(l[0], v)], [l[1], add(l[1], v)]);
    }),
  );
  return filterAt ? allCandidates.filter((seg) => isOnLine(filterAt, seg)) : allCandidates;
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
