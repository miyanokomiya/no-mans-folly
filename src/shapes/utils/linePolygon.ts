import { createShape, GetShapeStruct, getWrapperRect, resizeShape } from "..";
import { getBezierControlForArc, isArcControl } from "../../utils/path";
import { getLinePath, LineShape } from "../line";
import { LinePolygonShape } from "../polygons/linePolygon";
import { SimplePath } from "../simplePolygon";
import {
  getArcCurveParamsByNormalizedControl,
  getArcLerpFn,
  getRotationAffine,
  getSegments,
  ISegment,
} from "../../utils/geometry";
import { mapReduce } from "../../utils/commons";
import { AffineMatrix, IVec2, multiAffines } from "okageo";
import { ArcCurveControl } from "../../models";
import { getNakedLineShape } from "./line";
import { getRectShapeCenter } from "../rectPolygon";

export function patchLinePolygonFromLine(
  getStruct: GetShapeStruct,
  line: LineShape,
): Partial<LineShape & LinePolygonShape> {
  const result = createLinePolygonFromLine(getStruct, line);
  const patch = mapReduce<any, any, any>(line, () => undefined);
  return { ...patch, ...result };
}

function createLinePolygonFromLine(getStruct: GetShapeStruct, line: LineShape): LinePolygonShape {
  const rect = getWrapperRect(getStruct, getNakedLineShape(line), undefined, true);
  const p = { x: rect.x, y: rect.y };
  const normalizedLine = { ...line, ...resizeShape(getStruct, line, [1, 0, 0, 1, -p.x, -p.y]) };
  const normalizedVertices = getLinePath(normalizedLine);
  const polygonPath = convertLinePathToSimplePath(normalizedVertices, normalizedLine.curves);

  const linePolygon = createShape<LinePolygonShape>(getStruct, "line_polygon", {
    ...normalizedLine,
    p,
    path: {
      path: polygonPath.path,
      curves: polygonPath.curves,
    },
    srcLine: {
      vertices: normalizedVertices.map((p) => ({ p })),
      curves: normalizedLine.curves,
      lineType: normalizedLine.lineType,
      curveType: normalizedLine.curveType,
    },
    width: rect.width,
    height: rect.height,
  });

  return linePolygon;
}

export function patchLineFromLinePolygon(
  getStruct: GetShapeStruct,
  linePolygon: LinePolygonShape,
): Partial<LineShape & LinePolygonShape> {
  const result = createLineFromLinePolygon(getStruct, linePolygon);
  const patch = mapReduce<any, any, any>(linePolygon, () => undefined);
  return { ...patch, ...result };
}

function createLineFromLinePolygon(getStruct: GetShapeStruct, linePolygon: LinePolygonShape): LineShape {
  const srcVertices = linePolygon.srcLine?.vertices ?? linePolygon.path.path.map((p) => ({ p }));
  const srcCurves = linePolygon.srcLine?.curves ?? linePolygon.path.curves;

  const p = srcVertices[0].p;
  const q = srcVertices[srcVertices.length - 1].p;
  const body = srcVertices.slice(1, srcVertices.length - 1);
  const normalizedLine = createShape<LineShape>(getStruct, "line", {
    ...linePolygon,
    ...linePolygon.srcLine,
    p,
    q,
    body: body.length > 0 ? body : undefined,
    curves: srcCurves,
  });

  const translateAffine: AffineMatrix = [1, 0, 0, 1, linePolygon.p.x, linePolygon.p.y];
  const shiftAffine =
    linePolygon.rotation === 0
      ? translateAffine
      : multiAffines([getRotationAffine(linePolygon.rotation, getRectShapeCenter(linePolygon)), translateAffine]);

  return {
    ...normalizedLine,
    ...resizeShape(getStruct, normalizedLine, shiftAffine),
  };
}

function convertLinePathToSimplePath(vertices: IVec2[], curves: LineShape["curves"]): SimplePath {
  const ret: SimplePath = { path: [], curves: [] };

  getSegments(vertices).map((seg, i) => {
    const c = curves?.[i];
    if (!c || !isArcControl(c)) {
      ret.path.push(seg[0]);
      ret.curves!.push(c);
      return;
    }

    const path = covertArcToBezier(seg, c);
    ret.path.push(...path.path.slice(0, path.path.length - 1));
    if (path.curves) ret.curves!.push(...path.curves);
  });
  ret.path.push(vertices[vertices.length - 1]);
  if (ret.curves!.every((c) => !c)) {
    ret.curves = undefined;
  }

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

export function canMakePolygon(line: LineShape): boolean {
  if (line.lineType === "elbow") return false;
  if (!!line.body && line.body.length > 0) return true;
  // When a line has a curved segment, it can consist a polygon.
  return !!line.curves && !!line.curves[0];
}
