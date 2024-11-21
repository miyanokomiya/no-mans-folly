import { getCrossLineAndBezier3, getCrossSegAndLine, getRectCenter, getSymmetry, isSame, IVec2 } from "okageo";
import { getEdges, LineShape, struct } from "../line";
import {
  getClosestOutlineInfoOfLineByEdgeInfo,
  getPolylineEdgeInfo,
  isArcControl,
  isBezieirControl,
  PolylineEdgeInfo,
} from "../../utils/path";
import { getArcCurveParamsByNormalizedControl, getCrossLineAndArcRotated, ISegment } from "../../utils/geometry";
import { ConnectionPoint } from "../../models";

/**
 * Returns the line with minimum styles.
 * This can be useful for derive optimal bounds of the line.
 */
export function getNakedLineShape(line: LineShape): LineShape {
  return {
    ...line,
    stroke: { ...line.stroke, width: 0 },
    pHead: undefined,
    qHead: undefined,
  };
}

export function patchByFliplineH(line: LineShape): Partial<LineShape> {
  const rect = struct.getWrapperRect(line);
  const c = getRectCenter(rect);
  const flipFn = (v: IVec2) => getSymmetry(v, { x: c.x, y: v.y });
  return patchByFlipline(line, flipFn);
}

export function patchByFliplineV(line: LineShape): Partial<LineShape> {
  const rect = struct.getWrapperRect(line);
  const c = getRectCenter(rect);
  const flipFn = (v: IVec2) => getSymmetry(v, { x: v.x, y: c.y });
  return patchByFlipline(line, flipFn);
}

function patchByFlipline(line: LineShape, flipFn: (v: IVec2) => IVec2): Partial<LineShape> {
  const ret: Partial<LineShape> = {};

  const nextP = flipFn(line.p);
  const nextQ = flipFn(line.q);

  if (isSame(nextP, line.q) && isSame(nextQ, line.p)) {
    ret.p = line.q;
    ret.q = line.p;
    if (line.pConnection || line.qConnection) {
      ret.pConnection = line.qConnection;
      ret.qConnection = line.pConnection;
    }
  } else {
    if (!isSame(nextP, line.p)) {
      if (line.pConnection) ret.pConnection = undefined;
      ret.p = nextP;
    }

    if (!isSame(nextQ, line.q)) {
      if (line.qConnection) ret.qConnection = undefined;
      ret.q = nextQ;
    }
  }

  ret.body = line.body?.map((b) => {
    const p = flipFn(b.p);
    if (!isSame(p, b.p)) {
      if (b.c) return { p };
    }
    return { ...b, p };
  });
  ret.curves = line.curves?.map((c) =>
    !c ? undefined : isBezieirControl(c) ? { c1: flipFn(c.c1), c2: flipFn(c.c2) } : { d: { x: c.d.x, y: -c.d.y } },
  );

  return ret;
}

export function getClosestOutlineInfoOfLine(
  line: LineShape,
  p: IVec2,
  threshold: number,
): [p: IVec2, rate: number] | undefined {
  const edgeInfo = getLineEdgeInfo(line);
  return getClosestOutlineInfoOfLineByEdgeInfo(edgeInfo, p, threshold);
}

export function getLineEdgeInfo(line: LineShape): PolylineEdgeInfo {
  return getPolylineEdgeInfo(getEdges(line), line.curves);
}

export function isConnectedToCenter(c: ConnectionPoint): boolean {
  return isSame(c.rate, { x: 0.5, y: 0.5 });
}

export function getIntersectionsBetweenLineShapeAndLine(shape: LineShape, line: ISegment): IVec2[] {
  const edges = getEdges(shape);
  const curves = shape.curves;

  const intersections: IVec2[] = [];
  edges.forEach((seg, i) => {
    const curve = curves?.[i];
    if (isBezieirControl(curve)) {
      const inter = getCrossLineAndBezier3(line, [seg[0], curve.c1, curve.c2, seg[1]]);
      if (inter.length > 0) intersections.push(...inter);
    } else if (isArcControl(curve)) {
      const arcParams = getArcCurveParamsByNormalizedControl(seg, curve.d);
      if (arcParams) {
        const inter = getCrossLineAndArcRotated(
          line,
          arcParams.c,
          arcParams.radius,
          arcParams.radius,
          0,
          arcParams.counterclockwise ? arcParams.to : arcParams.from,
          arcParams.counterclockwise ? arcParams.from : arcParams.to,
        );
        if (inter?.length) intersections.push(...inter);
      } else {
        const inter = getCrossSegAndLine(seg, line);
        if (inter) intersections.push(inter);
      }
    } else {
      const inter = getCrossSegAndLine(seg, line);
      if (inter) intersections.push(inter);
    }
  });
  return intersections;
}
