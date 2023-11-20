import {
  IVec2,
  getApproPoints,
  getBezier3LerpFn,
  getDistance,
  getPathPointAtLengthFromStructs,
  getPedal,
  getPolylineLength,
  getRectCenter,
  isOnSeg,
} from "okageo";
import { LineShape, getLinePath, isCurveLine } from "../shapes/line";
import { TextShape, patchPosition } from "../shapes/text";
import { BEZIER_APPROX_SIZE, ISegment, getRotateFn, getSegments } from "./geometry";
import { pickMinItem } from "./commons";

export function attachLabelToLine(line: LineShape, label: TextShape, margin = 0): Partial<TextShape> {
  const labelBounds = { x: label.p.x, y: label.p.y, width: label.width, height: label.height };
  const labelCenter = getRectCenter(labelBounds);
  const rotateFn = getRotateFn(-label.rotation, labelCenter);

  const edgeInfo = getEdgeInfo(line, rotateFn);
  // const edges = getEdges(line).map(([a, b]) => [rotateFn(a), rotateFn(b)]);
  const edges = edgeInfo.edges;

  const values = edges.map<[number, number, IVec2]>((edge, i) => {
    let pedal = getPedal(labelCenter, edge);
    if (!isOnSeg(pedal, edge)) {
      pedal = getDistance(edge[0], labelCenter) <= getDistance(edge[1], labelCenter) ? edge[0] : edge[1];
    }
    return [i, getDistance(labelCenter, pedal), pedal];
  });
  const closestValue = pickMinItem(values, (v) => v[1])!;
  const closestEdgeIndex = closestValue[0];
  const closestPedal = closestValue[2];

  let patch: Partial<TextShape> = {};

  if (closestPedal.x <= labelBounds.x) {
    patch.hAlign = "left";
  } else if (labelBounds.x + labelBounds.width <= closestPedal.x) {
    patch.hAlign = "right";
  } else {
    patch.hAlign = "center";
  }

  if (closestPedal.y <= labelBounds.y) {
    patch.vAlign = "top";
  } else if (labelBounds.y + labelBounds.height <= closestPedal.y) {
    patch.vAlign = "bottom";
  } else {
    patch.vAlign = "center";
  }

  const dList = edgeInfo.edgeLengths;
  const totalD = edgeInfo.totalLength;
  let d = 0;
  for (let i = 0; i < closestEdgeIndex; i++) {
    d += dList[i];
  }
  d += getDistance(edges[closestEdgeIndex][0], closestPedal);
  const rate = d / totalD;
  patch.lineAttached = rate;

  const distP = edgeInfo.lerpFn?.(rate) ?? closestPedal;
  patch = { ...patch, ...patchPosition({ ...label, ...patch }, rotateFn(distP, true), margin) };

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

function getEdgeInfo(
  line: LineShape,
  rotateFn: ReturnType<typeof getRotateFn>,
): {
  edges: ISegment[];
  edgeLengths: number[];
  totalLength: number;
  lerpFn?: (rate: number) => IVec2;
} {
  const edges = getSegments(getLinePath(line).map((p) => rotateFn(p)));
  if (!isCurveLine(line)) {
    const edgeLengths = edges.map((edge) => getDistance(edge[0], edge[1]));
    return {
      edges,
      edgeLengths,
      totalLength: edgeLengths.reduce((n, l) => n + l, 0),
    };
  }

  const curves = line.curves.map((c) => [rotateFn(c.c1), rotateFn(c.c2)]);
  const sections: [IVec2, IVec2, IVec2, IVec2][] = [];
  for (let i = 0; i < edges.length; i++) {
    sections.push([edges[i][0], curves[i][0], curves[i][1], edges[i][1]]);
  }
  const pathStructs = sections.map((sec) => {
    const lerpFn = getBezier3LerpFn(sec);
    const points = getApproPoints(lerpFn, BEZIER_APPROX_SIZE);
    const edges = getSegments(points);
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
