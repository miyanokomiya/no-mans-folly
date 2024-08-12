import { add, getUnit, IVec2, multi, sub } from "okageo";
import { getLinePath, getLineWidth, LINE_JUMP_BASE_INTERVAL, LineShape } from "../shapes/line";
import { splitPointsToCloseSections, getCrossSegAndSeg, getSegments, ISegment, getD2, sortPointFrom } from "./geometry";
import { LineJumpMap } from "../shapes/core";

type LineIntersectionMap = Map<string, PolylineIntersections>;

interface PolylineIntersections {
  segments: (SegmentIntersections | undefined)[];
}

interface SegmentIntersections {
  points: [p: IVec2, size: number][];
}

export function getLineJumpMap(lines: LineShape[], interval = LINE_JUMP_BASE_INTERVAL): LineJumpMap {
  const ret: LineJumpMap = new Map();
  const lineMap = new Map(lines.map((l) => [l.id, l]));
  const intersectionMap = getLineIntersectionMap(lines);
  for (const [id, info] of intersectionMap) {
    const line = lineMap.get(id)!;
    const linePath = getSegments(getLinePath(line));
    const jumps = getLineJumpPoints(linePath, info, interval + getLineWidth(line));
    ret.set(id, jumps);
  }

  return ret;
}

export function getLineIntersectionMap(lines: LineShape[]): LineIntersectionMap {
  const ret: LineIntersectionMap = new Map();
  const behindPolylines: [ISegment[], size: number][] = [];

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

    behindPolylines.push([linePath.filter((_, i) => !line.curves?.[i]), getLineWidth(line)]);
  });

  return ret;
}

function getPolylineIntersections(
  target: ISegment[],
  others: [ISegment[], size: number][],
  disabledSegments: Set<number>,
): PolylineIntersections | undefined {
  const ret: PolylineIntersections = { segments: [] };
  let hasItem = false;

  target.forEach((targetSeg, i) => {
    if (disabledSegments.has(i)) {
      ret.segments.push(undefined);
      return;
    }

    const intersections: [IVec2, number][] = [];
    others.forEach(([otherSegs, size]) => {
      otherSegs.forEach((otherSeg) => {
        const intersection = getCrossSegAndSeg(targetSeg, otherSeg);
        if (intersection) {
          intersections.push([intersection, size]);
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

export function makeJumps(seg: ISegment, intersections: SegmentIntersections["points"], interval: number): ISegment[] {
  const sizeMap = new Map(intersections);
  const sections = splitPointsToCloseSections(
    sortPointFrom(
      seg[0],
      intersections.map(([secs]) => secs),
    ).map((p) => [p, sizeMap.get(p)!]),
    interval,
  );

  const unit = getUnit(sub(seg[1], seg[0]));
  const intervalHalfD2 = (interval * interval) / 4;

  return sections.map((points, i) => {
    const [p0, size0] = points[0];
    const [p1, size1] = points.length === 1 ? points[0] : points[1];

    return [
      i === 0 && getD2(sub(p0, seg[0])) <= intervalHalfD2 ? seg[0] : sub(p0, multi(unit, (interval + size0) / 2)),
      i === sections.length - 1 && getD2(sub(p1, seg[1])) <= intervalHalfD2
        ? seg[1]
        : add(p1, multi(unit, (interval + size1) / 2)),
    ];
  });
}
