import { getRectCenter, getSymmetry, isSame, IVec2 } from "okageo";
import { getEdges, LineShape, struct } from "../line";
import {
  getClosestPointOnPolyline,
  getIntersectionsBetweenLineAndPolyline,
  getPolylineEdgeInfo,
  isBezieirControl,
  PolylineEdgeInfo,
  splitPathAtRate,
} from "../../utils/path";
import { ISegment } from "../../utils/geometry";
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
  return getClosestPointOnPolyline(edgeInfo, p, threshold);
}

export function getLineEdgeInfo(line: LineShape): PolylineEdgeInfo {
  return getPolylineEdgeInfo(getEdges(line), line.curves);
}

export function isConnectedToCenter(c: ConnectionPoint): boolean {
  return isSame(c.rate, { x: 0.5, y: 0.5 });
}

export function getIntersectionsBetweenLineShapeAndLine(shape: LineShape, line: ISegment): IVec2[] {
  return getIntersectionsBetweenLineAndPolyline(line, getEdges(shape), shape.curves);
}

export function getShapePatchInfoBySplitingLineAt(
  line: LineShape,
  index: number,
  p: IVec2,
  threshold: number,
): [newLineSrc: Partial<LineShape>, currentLinePatch: Partial<LineShape>] | undefined {
  const edge = getEdges(line)[index];
  const curve = line.curves?.[index];
  const closestInfo = getClosestPointOnPolyline(getPolylineEdgeInfo([edge], [curve]), p, threshold);
  if (!closestInfo) return;

  const rate = closestInfo[1];
  const splitResult = splitPathAtRate({ edge, curve }, rate);

  const filledCurves: LineShape["curves"] = line.curves?.concat() ?? [];
  for (let i = 0; i < edge.length; i++) {
    if (filledCurves[i] === undefined) {
      filledCurves[i] = undefined;
    }
  }

  const cleanArray = (arr?: any[]) => {
    return arr?.every((v) => v === undefined) ? undefined : arr;
  };

  const currentLinePatch: Partial<LineShape> = {
    q: splitResult[0].edge[1],
    body: cleanArray(line.body?.slice(0, index)),
    curves: cleanArray([...filledCurves.slice(0, index), splitResult[0].curve]),
  };
  const newLineSrc: Partial<LineShape> = {
    p: splitResult[1].edge[0],
    q: line.q,
    body: cleanArray(line.body?.slice(index)),
    curves: cleanArray([splitResult[1].curve, ...(line.curves?.slice(index + 1) ?? [])]),
  };
  return [newLineSrc, currentLinePatch];
}
