import { IVec2, getCenter, getDistance, getPedal, isOnSeg } from "okageo";
import { LineShape, getEdges } from "../shapes/line";
import { TextShape, patchPosition, struct as textStruct } from "../shapes/text";

export function attachLabelToLine(line: LineShape, label: TextShape): Partial<TextShape> {
  const edges = getEdges(line);
  const labelBounds = textStruct.getWrapperRect(label);
  const labelLocalRect = textStruct.getLocalRectPolygon(label);
  const labelCenter = getCenter(labelLocalRect[0], labelLocalRect[2]);

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

  const patch: Partial<TextShape> = {};

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

  const patch2 = patchPosition({ ...label, ...patch }, closestPedal);

  const ret = { ...patch, ...(patch2 ?? {}) };
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
