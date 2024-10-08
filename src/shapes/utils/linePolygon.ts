import { createShape, GetShapeStruct, getWrapperRect, resizeShape } from "..";
import { getBezierControlForArc, isArcControl } from "../../utils/path";
import { getLinePath, LineShape } from "../line";
import { LinePolygonShape } from "../polygons/linePolygon";
import { SimplePath } from "../simplePolygon";
import { getArcCurveParamsByNormalizedControl, getArcLerpFn, getSegments, ISegment } from "../../utils/geometry";
import { mapReduce } from "../../utils/commons";
import { IVec2 } from "okageo";
import { ArcCurveControl } from "../../models";

export function patchLinePolygonFromLine(getStruct: GetShapeStruct, line: LineShape): LinePolygonShape {
  const result = createLinePolygonFromLine(getStruct, line);
  const patch = mapReduce<any, any, any>(line, () => undefined);
  return { ...patch, ...result };
}

export function createLinePolygonFromLine(getStruct: GetShapeStruct, line: LineShape): LinePolygonShape {
  const rect = getWrapperRect(getStruct, getNakedLineShape(line), undefined, true);
  const p = { x: rect.x, y: rect.y };
  const normalizedLine = { ...line, ...resizeShape(getStruct, line, [1, 0, 0, 1, -p.x, -p.y]) };
  const polygonPath = convertLinePathToSimplePath(getLinePath(normalizedLine), normalizedLine.curves);

  const linePolygon = createShape<LinePolygonShape>(getStruct, "line_polygon", {
    ...normalizedLine,
    p,
    path: {
      path: polygonPath.path,
      curves: polygonPath.curves,
    },
    srcLine: {
      vertices: [{ p: normalizedLine.p }, ...(normalizedLine.body ?? []), { p: normalizedLine.q }],
      curves: normalizedLine.curves,
      lineType: normalizedLine.lineType,
      curveType: normalizedLine.curveType,
    },
    width: rect.width,
    height: rect.height,
  });

  return linePolygon;
}

export function patchLineFromLinePolygon(getStruct: GetShapeStruct, linePolygon: LinePolygonShape): LineShape {
  const result = createLineFromLinePolygon(getStruct, linePolygon);
  const patch = mapReduce<any, any, any>(linePolygon, () => undefined);
  return { ...patch, ...result };
}

export function createLineFromLinePolygon(getStruct: GetShapeStruct, linePolygon: LinePolygonShape): LineShape {
  const srcVertices = linePolygon.srcLine.vertices;
  const p = srcVertices[0].p;
  const q = srcVertices[srcVertices.length - 1].p;
  const body = srcVertices.slice(1, srcVertices.length - 1);
  const normalizedLine = createShape<LineShape>(getStruct, "line", {
    ...linePolygon,
    ...linePolygon.srcLine,
    p,
    q,
    body: body.length > 0 ? body : undefined,
  });
  const shifted = {
    ...normalizedLine,
    ...resizeShape(getStruct, normalizedLine, [1, 0, 0, 1, linePolygon.p.x, linePolygon.p.y]),
  };
  return shifted;
}

function convertLinePathToSimplePath(vertices: IVec2[], curves: LineShape["curves"]): SimplePath {
  const ret: Required<SimplePath> = { path: [], curves: [] };

  getSegments(vertices).map((seg, i) => {
    const c = curves?.[i];
    if (!c || !isArcControl(c)) {
      ret.path.push(...seg);
      ret.curves.push(c);
      return;
    }

    const path = covertArcToBezier(seg, c);
    ret.path.push(...path.path);
    if (path.curves) ret.curves.push(...path.curves);
  });

  return ret;
}

export function covertArcToBezier(seg: ISegment, c: ArcCurveControl): SimplePath {
  const ret: Required<SimplePath> = { path: [], curves: [] };

  const arcParams = getArcCurveParamsByNormalizedControl(seg, c.d);
  if (!arcParams) {
    ret.path.push(...seg);
    ret.curves.push(undefined);
    return ret;
  }

  // Split the arc into 4 partials since bezier approximation only works well with arc within 90 degree.
  const partials = [1, 2, 3, 4];
  const arcLerpFn = getArcLerpFn(arcParams);
  const partialSegs = getSegments([seg[0], ...partials.map((n) => arcLerpFn(n / partials.length))]);
  const partialBeziers = partialSegs.map((partialSeg) => {
    return getBezierControlForArc(arcParams.c, partialSeg[0], partialSeg[1]);
  });

  partialBeziers.forEach((partialBezier, i) => {
    const partialSeg = partialSegs[i];
    ret.path.push(partialSeg[0]);
    ret.curves.push(partialBezier);
  });
  ret.path.push(partialSegs[partialSegs.length - 1][1]);

  return ret;
}

function getNakedLineShape(line: LineShape): LineShape {
  return {
    ...line,
    stroke: { ...line.stroke, width: 0 },
    pHead: undefined,
    qHead: undefined,
  };
}

export function canMakePolygon(line: LineShape): boolean {
  if (line.lineType === "elbow") return false;
  if (!!line.body && line.body.length > 0) return true;
  // When a line has a curved segment, it can consist a polygon.
  return !!line.curves && !!line.curves[0];
}
