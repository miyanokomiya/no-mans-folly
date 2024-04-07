import {
  IVec2,
  MINVALUE,
  add,
  divideBezier3,
  getCrossSegAndBezier3WithT,
  getDistance,
  getInner,
  getNorm,
  getRadian,
  getUnit,
  multi,
  sub,
} from "okageo";
import { BezierCurveControl } from "../models";
import { ISegment, getCrossSegAndSegWithT, getRotateFn } from "./geometry";

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

// Ref: https://math.stackexchange.com/questions/4235124/getting-the-most-accurate-bezier-curve-that-plots-a-sine-wave
const v = Math.sqrt(3) * 2;
const u = (8 / 3 - Math.sqrt(3)) / 2;
export function getWavePathControl(from: IVec2, to: IVec2, waveBoundsHeight: number): BezierCurveControl {
  const halfSize = waveBoundsHeight / 2;
  const len = getDistance(from, to);
  const rotateFn = getRotateFn(getRadian(to, from));

  return {
    c1: add(from, rotateFn({ x: len * u, y: halfSize * v })),
    c2: add(from, rotateFn({ x: len * (1 - u), y: -halfSize * v })),
  };
}

export function getCornerRadiusArc(p0: IVec2, p1: IVec2, p2: IVec2, radius: number): [c: IVec2, q1: IVec2, q2: IVec2] {
  if (Math.abs(radius) < MINVALUE) return [p1, p1, p1];

  const v0 = sub(p0, p1);
  const v1 = sub(p2, p1);
  const d0 = getNorm(v0);
  const d1 = getNorm(v1);
  if (Math.abs(d0 * d1 * radius) < MINVALUE) return [p1, p1, p1];

  const u0 = multi(v0, 1 / d0);
  const u1 = multi(v1, 1 / d1);
  const rad = Math.acos(getInner(u0, u1)) / 2;
  const d = Math.min(radius / Math.tan(rad), d0, d1);
  const q0 = add(p1, multi(u0, d));
  const q1 = add(p1, multi(u1, d));
  const c = add(p1, multi(getUnit(add(u0, u1)), d / Math.cos(rad)));
  return [c, q0, q1];
}
