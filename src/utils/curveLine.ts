import { IVec2, getBezierInterpolation } from "okageo";
import { BezierCurveControl } from "../models";
import { CurveType, LineShape, getLinePath } from "../shapes/line";

export function getAutomaticCurve(path: IVec2[]): BezierCurveControl[] | undefined {
  if (path.length <= 2) return;
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
