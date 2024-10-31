import {
  IVec2,
  getApproPoints,
  getDistance,
  getPathPointAtLengthFromStructs,
  getPolylineLength,
  getRectCenter,
} from "okageo";
import { LineShape, getLinePath, isCurveLine, isLineShape } from "../line";
import { TextShape, isTextShape, patchPosition } from "../text";
import { BEZIER_APPROX_SIZE, ISegment, getCurveLerpFn, getRotateFn, getSegments } from "../../utils/geometry";
import { Shape } from "../../models";
import { ShapeComposite } from "../../composables/shapeComposite";
import { getClosestOutlineInfoOfLine } from "./line";

export function attachLabelToLine(line: LineShape, label: TextShape, margin = 0): Partial<TextShape> {
  const labelBounds = { x: label.p.x, y: label.p.y, width: label.width, height: label.height };
  const labelCenter = getRectCenter(labelBounds);
  const rotateFn = getRotateFn(-label.rotation, labelCenter);

  const closestInfo = getClosestOutlineInfoOfLine(line, labelCenter, Infinity)!;
  const [closestPedal, rate] = closestInfo;

  let patch: Partial<TextShape> = {};

  const rotatedClosestPedal = rotateFn(closestPedal);
  if (rotatedClosestPedal.x <= labelBounds.x) {
    patch.hAlign = "left";
  } else if (labelBounds.x + labelBounds.width <= rotatedClosestPedal.x) {
    patch.hAlign = "right";
  } else {
    patch.hAlign = "center";
  }

  if (rotatedClosestPedal.y <= labelBounds.y) {
    patch.vAlign = "top";
  } else if (labelBounds.y + labelBounds.height <= rotatedClosestPedal.y) {
    patch.vAlign = "bottom";
  } else {
    patch.vAlign = "center";
  }

  patch.lineAttached = rate;

  const edgeInfo = getEdgeInfo(line);
  const distP = edgeInfo.lerpFn?.(rate) ?? closestPedal;
  patch = { ...patch, ...patchPosition({ ...label, ...patch }, distP, margin) };

  const ret = { ...patch };
  if (ret.hAlign === label.hAlign) {
    delete ret.hAlign;
  }
  if (ret.vAlign === label.vAlign) {
    delete ret.vAlign;
  }
  if (ret.lineAttached === label.lineAttached) {
    delete ret.lineAttached;
  }

  return ret;
}

function getEdgeInfo(line: LineShape): {
  edges: ISegment[];
  edgeLengths: number[];
  totalLength: number;
  lerpFn?: (rate: number) => IVec2;
} {
  const edges = getSegments(getLinePath(line));
  if (!isCurveLine(line)) {
    const edgeLengths = edges.map((edge) => getDistance(edge[0], edge[1]));
    return {
      edges,
      edgeLengths,
      totalLength: edgeLengths.reduce((n, l) => n + l, 0),
    };
  }

  const pathStructs = edges.map((edge, i) => {
    const curve = line.curves[i];
    const lerpFn = getCurveLerpFn(edge, curve);
    let points: IVec2[] = edge;
    let edges = [edge];
    if (curve) {
      points = getApproPoints(lerpFn, BEZIER_APPROX_SIZE);
      edges = getSegments(points);
    }
    return { lerpFn, length: getPolylineLength(points), edges };
  });

  const approxEdges = pathStructs.flatMap((s) => s.edges);
  const edgeLengths = approxEdges.map((edge) => getDistance(edge[0], edge[1]));
  const totalLength = pathStructs.reduce((n, s) => n + s.length, 0);
  return {
    edges: approxEdges,
    edgeLengths,
    totalLength,
    lerpFn: (rate) => getPathPointAtLengthFromStructs(pathStructs, totalLength * rate),
  };
}

export function isLineLabelShape(shapeComposite: ShapeComposite, shape: Shape): shape is TextShape {
  const parent = shapeComposite.shapeMap[shape.parentId ?? ""];
  return !!parent && isLineShape(parent) && isTextShape(shape) && shape.lineAttached !== undefined;
}
