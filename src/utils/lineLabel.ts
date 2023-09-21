import { IVec2, getDistance, getPedal, getRectCenter, isOnSeg } from "okageo";
import { LineShape, getEdges } from "../shapes/line";
import { TextShape, patchPosition } from "../shapes/text";
import { getRotateFn } from "./geometry";

export function attachLabelToLine(line: LineShape, label: TextShape, margin = 0): Partial<TextShape> {
  const labelBounds = { x: label.p.x, y: label.p.y, width: label.width, height: label.height };
  const labelCenter = getRectCenter(labelBounds);
  const rotateFn = getRotateFn(-label.rotation, labelCenter);
  const edges = getEdges(line).map(([a, b]) => [rotateFn(a), rotateFn(b)]);

  const values = edges.map<[number, number, IVec2]>((edge, i) => {
    let pedal = getPedal(labelCenter, edge);
    if (!isOnSeg(pedal, edge)) {
      pedal = getDistance(edge[0], labelCenter) <= getDistance(edge[1], labelCenter) ? edge[0] : edge[1];
    }
    return [i, getDistance(labelCenter, pedal), pedal];
  });
  const closestValue = values.sort((a, b) => a[1] - b[1])[0];
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

  const dList = edges.map((edge) => getDistance(edge[0], edge[1]));
  const totalD = dList.reduce((n, d) => n + d, 0);
  let d = 0;
  for (let i = 0; i < closestEdgeIndex; i++) {
    d += dList[i];
  }
  d += getDistance(edges[closestEdgeIndex][0], closestPedal);
  patch.lineAttached = d / totalD;

  patch = { ...patch, ...patchPosition({ ...label, ...patch }, rotateFn(closestPedal, true), margin) };

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
