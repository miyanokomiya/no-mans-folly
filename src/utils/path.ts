import { IVec2, divideBezier3, getCrossSegAndBezier3WithT } from "okageo";
import { BezierCurveControl } from "../models";
import { ISegment, getCrossSegAndSegWithT } from "./geometry";

export type BezierPath = { path: IVec2[]; curves: (BezierCurveControl | undefined)[] };

export type PathLocation = [point: IVec2, segmentIndex: number, segmentRate: number];

export function getCrossBezierPathAndSegment(bezierPath: BezierPath, segment: ISegment): PathLocation[] {
  const { path, curves } = completeBezierPath(bezierPath);
  const candidates: PathLocation[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const pathSeg: ISegment = [path[i], path[i + 1]];
    const c = curves[i];
    if (c) {
      candidates.push(
        ...getCrossSegAndBezier3WithT(segment, [pathSeg[0], c.c1, c.c2, pathSeg[1]]).map<[IVec2, number, number]>(
          ([p, t]) => [p, i, t],
        ),
      );
    } else {
      const crossInfo = getCrossSegAndSegWithT(segment, pathSeg);
      if (crossInfo) candidates.push([crossInfo[0], i, crossInfo[2]]);
    }
  }

  return candidates;
}

/**
 * The order of vertices is basically unstable and unreliable.
 * - It starts from the first intersected segment when each intersection is on the unique segment.
 */
export function combineBezierPathAndPath(
  bezierPath: BezierPath,
  intersections: [PathLocation, PathLocation],
  middlePath: IVec2[],
): BezierPath {
  const { path, curves } = completeBezierPath(bezierPath);
  const [cross0, cross1] = intersections;
  const ret: BezierPath = { path: [], curves: [] };

  if (cross0[1] === cross1[1]) {
    // When both intersections are on the same segment
    for (let i = 0; i < path.length - 1; i++) {
      const p = path[i];
      const q = path[i + 1];
      const c = curves[i];

      ret.path.push(p);

      if (i === cross0[1]) {
        if (c) {
          const [b0] = divideBezier3([p, c.c1, c.c2, q], cross0[2]);
          ret.curves.push({ c1: b0[1], c2: b0[2] });
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          middlePath.forEach((p) => {
            ret.path.push(p);
            ret.curves.push(undefined);
          });

          const [, d1] = divideBezier3([p, c.c1, c.c2, q], cross1[2]);
          ret.path.push(cross1[0]);
          ret.curves.push({ c1: d1[1], c2: d1[2] });
        } else {
          ret.curves.push(undefined);
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          middlePath.forEach((p) => {
            ret.path.push(p);
            ret.curves.push(undefined);
          });
          ret.path.push(cross1[0]);
          ret.curves.push(undefined);
        }
      } else {
        ret.curves.push(c);
      }

      if (i === path.length - 2 && !(bezierPath.path.length < path.length)) {
        ret.path.push(q);
      }
    }
  } else {
    // When each intersection is on the deferrent segment
    let insideIntersections = false;

    for (let i = 0; i < path.length; i++) {
      const adjustedIndex = i + cross0[1];
      const realIndex = adjustedIndex % path.length;
      const realNextIndex = (adjustedIndex + 1) % path.length;
      const p = path[realIndex];
      const q = path[realNextIndex];
      const c = curves[realIndex];

      const pushP = () => {
        // Ignore the vertex when it's inserted via completing process.
        if (!(realIndex === path.length - 1 && bezierPath.path.length < path.length)) {
          ret.path.push(p);
        }
      };
      const pushC = () => {
        // Same as "pushP"
        if (!(realIndex === path.length - 1 && bezierPath.path.length < path.length)) {
          ret.curves.push(c);
        }
      };

      if (realIndex === cross0[1]) {
        pushP();

        if (c) {
          const [b0] = divideBezier3([p, c.c1, c.c2, q], cross0[2]);
          ret.curves.push({ c1: b0[1], c2: b0[2] });
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          middlePath.forEach((m) => {
            ret.path.push(m);
            ret.curves.push(undefined);
          });
        } else {
          pushC();
          ret.path.push(cross0[0]);
          ret.curves.push(undefined);
          middlePath.forEach((m) => {
            ret.path.push(m);
            ret.curves.push(undefined);
          });
        }
        insideIntersections = true;
      } else if (realIndex === cross1[1]) {
        ret.path.push(cross1[0]);

        if (c) {
          const [, d1] = divideBezier3([p, c.c1, c.c2, q], cross1[2]);
          ret.curves.push({ c1: d1[1], c2: d1[2] });
        } else {
          pushC();
        }
        insideIntersections = false;
      } else if (insideIntersections) {
        // Skip segments covered by intersections.
      } else {
        pushP();
        pushC();
      }
    }
  }

  return completeBezierPath(ret);
}

/**
 * Add the first point as the last point when the last segment has curve param.
 */
function completeBezierPath(bezierPath: BezierPath): BezierPath {
  if (bezierPath.path.length > 0 && bezierPath.path.length === bezierPath.curves.length) {
    return {
      path: [...bezierPath.path, bezierPath.path[0]],
      curves: bezierPath.curves,
    };
  }

  return bezierPath;
}