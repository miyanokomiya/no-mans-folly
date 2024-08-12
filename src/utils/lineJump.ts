import { IVec2 } from "okageo";
import { getLinePath, LineShape } from "../shapes/line";
import { getCrossSegAndSeg, getSegments, ISegment } from "./geometry";

type LineJumpMap = Map<string, PolylineIntersections>;

interface PolylineIntersections {
  segments: (SegmentIntersections | undefined)[];
}

interface SegmentIntersections {
  points: IVec2[];
}

export function getLineJumpMap(lines: LineShape[]): LineJumpMap {
  const ret: LineJumpMap = new Map();
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

    behindPolylines.push(linePath);
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
