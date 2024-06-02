import {
  IVec2,
  MINVALUE,
  add,
  getBezierInterpolation,
  getCenter,
  getDistance,
  getNorm,
  getPeriodicBezierInterpolation,
  isSame,
  multi,
  sub,
} from "okageo";
import { BezierCurveControl } from "../models";
import { CurveType, LineBodyItem, LineShape, getLinePath } from "../shapes/line";
import { getBezierControlForArc, getCornerRadiusArc } from "./path";

export function getAutomaticCurve(path: IVec2[]): BezierCurveControl[] | undefined {
  if (path.length <= 2) return;

  if (isSame(path[0], path[path.length - 1])) {
    return getPeriodicBezierInterpolation(path).map(([c1, c2]) => ({ c1, c2 }));
  }

  return getBezierInterpolation(path).map(([c1, c2]) => ({ c1, c2 }));
}

/**
 * When "force" is true, this function always returns the calculated result.
 */
export function getPatchByChangingCurveType(
  line: LineShape,
  curveType?: CurveType,
  force = false,
): Partial<LineShape> | undefined {
  if (!force && line.curveType === curveType) return;

  if (curveType === "auto") {
    return {
      curves: getAutomaticCurve(getLinePath(line)),
      curveType,
    };
  } else {
    return { curves: undefined, curveType: undefined };
  }
}

export function getDefaultCurveBody(p: IVec2, q: IVec2): LineShape["body"] {
  const pq = sub(q, p);
  const d = getNorm(pq);
  if (d < MINVALUE) return;

  const c = getCenter(p, q);
  // Use arbitrary rate that makes a curve look good.
  const rate = 1 / 5;
  const v = multi({ x: -pq.y, y: pq.x }, rate);
  return [{ p: add(c, v) }];
}

/**
 * Applies corner radius to each corner.
 * => Supposes that target line doesn't have curves.
 */
export function applyCornerRadius(line: LineShape): Partial<LineShape> {
  const body = line.body;
  if (!body || body.length === 0) return {};

  const radius = 20;
  const bodyPath = body.map((b) => b.p);

  const newBody: LineBodyItem[] = [];
  const newCurves: LineShape["curves"] = [];

  const path = [line.p, ...bodyPath, line.q];
  for (let index = 0; index < path.length - 2; index++) {
    const a = path[index];
    const b = path[index + 1];
    const c = path[index + 2];
    const abD = getDistance(a, b);
    const bcD = getDistance(b, c);
    const r = Math.min(radius, abD / 2, bcD / 2);
    const info = getCornerRadiusArc(a, b, c, r);
    const control = getBezierControlForArc(info[0], info[1], info[2]);

    if (index < body.length && body[index].d) {
      newBody.push({ p: info[1] }, { p: info[2], d: body[index].d });
    } else {
      newBody.push({ p: info[1] }, { p: info[2] });
    }
    newCurves.push(undefined, control);
  }

  return {
    body: newBody,
    curves: newCurves,
  };
}

export function restoreBodyFromRoundedElbow(roundedElbow: LineShape): Pick<LineBodyItem, "d">[] {
  const body = roundedElbow.body;
  if (!body || body.length === 0) return [];

  const ret: Pick<LineBodyItem, "d">[] = [];
  const srcLength = body.length / 2;
  for (let i = 0; i < srcLength; i++) {
    const d = body[i * 2 + 1].d;
    ret.push(d ? { d } : {});
  }

  return ret;
}
