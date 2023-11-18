import { IVec2, getBezierInterpolation } from "okageo";
import { CurveControl } from "../models";
import { CurveType, LineShape, getLinePath } from "../shapes/line";

export function getAutomaticCurve(path: IVec2[]): CurveControl[] | undefined {
  if (path.length <= 2) return;
  return getBezierInterpolation(path).map(([c1, c2]) => ({ c1, c2 }));
}

export function getPatchByChangingCurveType(line: LineShape, curveType?: CurveType): Partial<LineShape> | undefined {
  if (line.curveType === curveType) return;

  if (curveType === "auto") {
    return {
      curves: getAutomaticCurve(getLinePath(line)),
      curveType,
    };
  } else {
    return { curves: undefined, curveType: undefined };
  }
}
