import { IVec2, getCrossSegAndBezier3WithT } from "okageo";
import { BezierCurveControl } from "../models";
import { ISegment, getCrossSegAndSegWithT } from "./geometry";

export type BezierPath = { path: IVec2[]; curves: (BezierCurveControl | undefined)[] };

export type PathLocation = [point: IVec2, segmentIndex: number, segmentRate: number];

export function getCrossBezierPathAndSegment(bezierPath: BezierPath, segment: ISegment): PathLocation[] {
  const { path, curves } = bezierPath;
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
