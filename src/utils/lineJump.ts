import { add, getUnit, IVec2, multi, sub } from "okageo";
import { getLinePath, LineShape } from "../shapes/line";
import { splitPointsToCloseSections, getCrossSegAndSeg, getSegments, ISegment, getD2, sortPointFrom } from "./geometry";
import { LineJumpMap } from "../shapes/core";

type LineIntersectionMap = Map<string, PolylineIntersections>;

interface PolylineIntersections {
  segments: (SegmentIntersections | undefined)[];
}

interface SegmentIntersections {
  points: IVec2[];
}

const LINE_JUMP_INTERVAL = 20;

export function getLineJumpMap(lines: LineShape[], interval = LINE_JUMP_INTERVAL): LineJumpMap {
  const ret: LineJumpMap = new Map();
  const lineMap = new Map(lines.map((l) => [l.id, l]));
  const intersectionMap = getLineIntersectionMap(lines);
  for (const [id, info] of intersectionMap) {
    const line = lineMap.get(id)!;
    const linePath = getSegments(getLinePath(line));
    const jumps = getLineJumpPoints(linePath, info, interval);
    ret.set(id, jumps);
  }

  return ret;
}

export function getLineIntersectionMap(lines: LineShape[]): LineIntersectionMap {
  const ret: LineIntersectionMap = new Map();
  const behindPolylines: ISegment[][] = [];

  lines.forEach((line) => {
    const linePath = getSegments(getLinePath(line));
    if (line.jump) {
      const disabledSegments = new Set<number>();
      line.curves?.forEach((c, i) => {
        if (c) {
          disabledSegments.add(i);
        }
      });
      const pis = getPolylineIntersections(linePath, behindPolylines, disabledSegments);
      if (pis) {
        ret.set(line.id, pis);
      }
    }

    behindPolylines.push(linePath.filter((_, i) => !line.curves?.[i]));
  });

  return ret;
}

function getPolylineIntersections(
  target: ISegment[],
  others: ISegment[][],
  disabledSegments: Set<number>,
): PolylineIntersections | undefined {
  const ret: PolylineIntersections = { segments: [] };
  let hasItem = false;

  target.forEach((targetSeg, i) => {
    if (disabledSegments.has(i)) {
      ret.segments.push(undefined);
      return;
    }

    const intersections: IVec2[] = [];
    others.forEach((otherSegs) => {
      otherSegs.forEach((otherSeg) => {
        const intersection = getCrossSegAndSeg(targetSeg, otherSeg);
        if (intersection) {
          intersections.push(intersection);
        }
      });
    });

    if (intersections.length > 0) {
      ret.segments.push({ points: intersections });
      hasItem = true;
    } else {
      ret.segments.push(undefined);
    }
  });
  return hasItem ? ret : undefined;
}

function getLineJumpPoints(
  src: ISegment[],
  polylineIntersections: PolylineIntersections,
  interval: number,
): ISegment[][] {
  const ret: ISegment[][] = [];
  polylineIntersections.segments.forEach((si, i) => {
    if (!si) {
      ret.push([]);
    } else {
      ret.push(makeJumps(src[i], si.points, interval));
    }
  });
  return ret;
}

export function makeJumps(seg: ISegment, intersections: IVec2[], interval: number): ISegment[] {
  const sections = splitPointsToCloseSections(sortPointFrom(seg[0], intersections), interval);
  const v = multi(getUnit(sub(seg[1], seg[0])), interval / 2);
  const intervalHalfD2 = (interval * interval) / 4;

  return sections.map((points, i) => {
    const p0 = points[0];
    const p1 = points.length === 1 ? points[0] : points[1];

    return [
      i === 0 && getD2(sub(p0, seg[0])) <= intervalHalfD2 ? seg[0] : sub(p0, v),
      i === sections.length - 1 && getD2(sub(p1, seg[1])) <= intervalHalfD2 ? seg[1] : add(p1, v),
    ];
  });
}
