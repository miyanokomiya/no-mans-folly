import { createShape, GetShapeStruct, getWrapperRect, resizeShape } from "..";
import { getLinePath, LineShape } from "../line";
import { LinePolygonShape } from "../polygons/linePolygon";
import { getRotationAffine } from "../../utils/geometry";
import { mapReduce } from "../../utils/commons";
import { AffineMatrix, multiAffines } from "okageo";
import { getNakedLineShape } from "./line";
import { getRectShapeCenter } from "../rectPolygon";
import { convertLinePathToSimplePath } from "../../utils/path";

export function patchLinePolygonFromLine(
  getStruct: GetShapeStruct,
  line: LineShape,
  polyline?: 1,
): Partial<LineShape & LinePolygonShape> {
  const result = createLinePolygonFromLine(getStruct, line);
  const patch = mapReduce<any, any, any>(line, () => undefined);
  return { ...patch, ...result, polygonType: polyline };
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
      curves: polygonPath.curves.some((c) => c !== undefined) ? polygonPath.curves : undefined,
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

export function canMakePolygon(line: LineShape): boolean {
  if (line.lineType === "elbow") return false;
  return true;
}
